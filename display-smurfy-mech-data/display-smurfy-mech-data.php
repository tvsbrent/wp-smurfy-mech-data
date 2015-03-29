<?php
/**
 * @package Display_Smurfy_Mech_Data
 * @version 1.0
 */
/*
Plugin Name: Display Smurfy Mech Data
Plugin URI: https://github.com/tvsbrent/wp-smurfy-mech-data
Description: Adds support for dropdown tooltips to anchors linked to Smurfy builds
Version: 1.1
Author: Brent Schmidt
*/

namespace DisplaySmurfyMechData;

const ENDPOINT_ALL = 'display-smurfy-mech-data-all';
const ENDPOINT_LOADOUT = 'display-smurfy-mech-data-loadout';

/* ADD SCRIPTS */
add_action( 'init', 'DisplaySmurfyMechData\\AddScripts' );
function AddScripts()
{
  if( !is_admin() )
  {
    wp_enqueue_script('underscore');
    wp_register_script('display-smurfy-mech-data', plugins_url( '/display-smurfy-mech-data.min.js', __FILE__ ), array('jquery'), '1.1', true );
    wp_enqueue_script('display-smurfy-mech-data');
  }
  
  AddEndPoints();
}

/* ADD STYLES */
add_action( 'wp_enqueue_scripts', 'DisplaySmurfyMechData\\AddStyles' );
function AddStyles()
{
  if( !is_admin() )
  {
    wp_register_style( 'display-smurfy-mech-data', plugins_url( '/display-smurfy-mech-data.min.css', __FILE__ ), array(), '1.1', 'all' );
    wp_enqueue_style( 'display-smurfy-mech-data' );
  }
}

/* REDIRECT */
// This will handle retrieving the JSON data from Smurfy's site.
function AddEndPoints()
{
  add_rewrite_endpoint(ENDPOINT_ALL,      EP_ALL);
  add_rewrite_endpoint(ENDPOINT_LOADOUT,  EP_ALL);
}

function ActivateEndPoints() {
  // ensure our endpoint is added before flushing rewrite rules
  AddEndPoints();
  // flush rewrite rules - only do this on activation as anything more frequent is bad!
  flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'DisplaySmurfyMechData\\EndPointsActivate' );

function DeactivateEndPoints() {
  // flush rules on deactivate as well so they're not left hanging around uselessly
  flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'DisplaySmurfyMechData\\EndPointsDeactivate' );

add_action('template_redirect', 'DisplaySmurfyMechData\\MechDataEndPoint');
function MechDataEndPoint()
{
  global $wp_query;
  
  $queryVar = '';
  if( isset( $wp_query->query_vars[ENDPOINT_ALL] ) )
  {
    $queryVar = ENDPOINT_ALL;
  }
  else if( isset( $wp_query->query_vars[ENDPOINT_LOADOUT] ) )
  {
    $queryVar = ENDPOINT_LOADOUT;
  }
  else
  {
    // Not a request for us.
    return; 
  }
   
  // Format of the query is chassis:loadout
  $queryElements = explode(':', $wp_query->query_vars[$queryVar]);
  if( count( $queryElements ) != 2 )
  {
    header($_SERVER["SERVER_PROTOCOL"]." 400 Bad Request");
    exit;
  }
 
  $returnJSON = new \stdClass;
  // Get the chassis data, if necessary.
  if( $queryVar == ENDPOINT_ALL )
  {
    $returnJSON->chassis = new \stdClass;
    if( !GetJSON( sprintf( 'http://mwo.smurfy-net.de/api/data/mechs/%s.json', $queryElements[0] ), $returnJSON->chassis ) )
    {
      header($_SERVER["SERVER_PROTOCOL"]." 404 Not Found");
      exit;
    }
  }
  
  // Now get the loadout.
  $returnJSON->loadout = new \stdClass;
  if( !GetJSON( sprintf( 'http://mwo.smurfy-net.de/api/data/mechs/%s/loadouts/%s.json', $queryElements[0], $queryElements[1] ), $returnJSON->loadout ) )
  {
    header($_SERVER["SERVER_PROTOCOL"]." 404 Not Found");
    exit;
  }
  
  header( 'Content-Type: application/json' );
  echo json_encode( $returnJSON );
  exit;
}


function GetJSON( $url, &$json )
{
  try
  {
    //  Initiate curl
    $ch = curl_init();
    // Disable SSL verification
    curl_setopt( $ch, CURLOPT_SSL_VERIFYPEER, false );
    // Will return the response, if false it print the response
    curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
    // Set the url
    curl_setopt( $ch, CURLOPT_URL, $url );
    // Execute
    $result = curl_exec( $ch );
    // Closing
    curl_close( $ch );

    $json = json_decode( $result, true );
    
    return true;
  }
  catch( Exception $ex )
  {
    return false;
  } 
}

/* THE CONTENT */

// This class is used to store off all the
// parts we need of a Smurfy link in the content.
class SmurfyLink
{
  public $link = '';
  public $chassisID = '';
  public $loadoutID = '';
  public $linkText = '';
  // The start and end values are from the positions where this link's
  // information was found in the unmodified contents. After the content
  // variable is modified, these values are incorrect.
  public $startPosition = 0;
  public $endPosition = 0;
}

add_filter( 'the_content', 'DisplaySmurfyMechData\\ModifyContent' );
function ModifyContent( $content )
{ 
  $smurfyLinks = FindSmurfyLinks( $content );
  
  if( !empty( $smurfyLinks ) )
  {  
    $smurfyLinks = array_values( $smurfyLinks );
    
    $newContent = '';
    $positionCurrent = 0;
    
    $numElements = count( $smurfyLinks );
    for( $i = 0; $i < $numElements; $i++ )
    {
      $value = $smurfyLinks[$i];
      // Some basic verification.
      if( strlen( $value->chassisID ) > 5 ||
          strlen( $value->loadoutID ) != 40 )
      {
        continue;
      }
      
      $smurfyFormatted = FormatSmurfyLinks( $value, $itemData );
      if( $smurfyFormatted === false )
      {
        continue;
      }
      
      $left = '';     
      $leftOffset = 0;
      if( $i !== 0 )
      {
        $leftOffset = $smurfyLinks[$i - 1]->endPosition;
      }
      $left = substr( $content, $leftOffset, $value->startPosition - $leftOffset );
      
      $newContent .= $left . $smurfyFormatted;
      
      if( $i + 1 === $numElements &&
          strlen( $content ) > $value->endPosition )
      {
        $newContent .= substr( $content, $value->endPosition, strlen( $content ) - $value->endPosition );
      }
    }
    
    $content = $newContent;
  }
  
  return $content;
}

function FindSmurfyLinks( $content )
{
  $smurfyLinks = array();
  
  $pattern = "/~<a.*?#i=(\d.*?)&.*?l=(.*?)\".*?>(.*?)<\/a>/";
  $result = preg_match_all( $pattern, $content, $matches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE );
  
  if( $result !== 0 && $result !== false )
  {
    foreach( $matches as $match )
    {
      // Each match in our matches array is a multidimensional array.
      //   Element 0 is the entire link.
      //   Element 1 is the chassis ID.
      //   Element 2 is the loadout ID.
      //   Element 3 is the link text.
      // In each element, element 0 is the text, while subelement 1 is
      // that text's position.
      $smurfyLinkEntry = new SmurfyLink();
      $smurfyLinkEntry->link = substr($match[0][0],1);
      $smurfyLinkEntry->chassisID = $match[1][0];
      $smurfyLinkEntry->loadoutID = $match[2][0];
      $smurfyLinkEntry->linkText = $match[3][0];
      $smurfyLinkEntry->startPosition = $match[0][1];
      $smurfyLinkEntry->endPosition = $match[0][1] + strLen( $match[0][0] );
      
      $smurfyLinks[] = $smurfyLinkEntry;
    }
  }
  
  return $smurfyLinks;
}

function FormatSmurfyLinks( $smurfyLink )
{
  $body =
<<<EOD
  <div class="dsmd-container dsmd-animation">
    <div class="dsmd-title">
      {$smurfyLink->link}
      <span class="dsmd-expander dsmd-expander-arrow-down"></span>
    </div>
  </div>\n
EOD;

  return $body;
}
?>
