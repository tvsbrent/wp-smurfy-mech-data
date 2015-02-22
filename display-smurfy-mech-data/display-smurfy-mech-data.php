<?php
/**
 * @package Display_Smurfy_Mech_Data
 * @version 1.0
 */
/*
Plugin Name: Display Smurfy Mech Data
Plugin URI: https://github.com/tvsbrent/wp-smurfy-mech-data
Description: Adds support for dropdown tooltips to anchors linked to Smurfy builds
Version: 1.0
Author: Brent Schmidt
*/

namespace SmurfyMechData;

/* ADD SCRIPTS */
add_action( 'init', 'SmurfyMechData\\AddScripts' );
function AddScripts()
{
  if( !is_admin() )
  {
    wp_enqueue_script('underscore');
    wp_register_script('display-smurfy-mech-data', plugins_url( '/display-smurfy-mech-data.min.js', __FILE__ ), array('jquery'), '1.0', true );
    wp_enqueue_script('display-smurfy-mech-data');
  }
}

/* ADD STYLES */
add_action( 'wp_enqueue_scripts', 'SmurfyMechData\\AddStyles' );
function AddStyles()
{
  if( !is_admin() )
  {
    wp_register_style( 'display-smurfy-mech-data', plugins_url( '/display-smurfy-mech-data.min.css', __FILE__ ), array(), '1.0', 'all' );
    wp_enqueue_style( 'display-smurfy-mech-data' );
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

add_filter( 'the_content', 'SmurfyMechData\\ModifyContent' );
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
  $positionCurrent = 0;
  
  $targetAnchor = '<a href="http://mwo.smurfy-net.de/mechlab#i=';
  $targetAnchorLen = strlen( $targetAnchor );
  
  while( true )
  {
    $positionCurrent = strpos( $content, $targetAnchor, $positionCurrent );
    if( $positionCurrent === false )
    {
      // Nothing more to find, leave the loop.
      break;
    }
    
    $positionCursor = strpos( $content, '&', $positionCurrent );
    if( $positionCursor === false )
    {
      // Something no bueno here, move the start position
      // on and look for another link.
      $positionCurrent += $targetAnchorLen;
      continue;
    }
    
    // Start building the link, store off the start position.
    $smurfyLinkEntry = new SmurfyLink();
    $smurfyLinkEntry->startPosition = $positionCurrent;
    
    // Get the chassis now.
    $smurfyLinkEntry->chassisID = substr( $content, $positionCurrent + $targetAnchorLen, $positionCursor - $positionCurrent - $targetAnchorLen );
    
    // On to the loadout.
    $positionCurrent = FindSubstringBetween( $content, $positionCurrent, 'l=', '"', $smurfyLinkEntry->loadoutID );
    if( $positionCurrent === false )
    {
      continue;
    }
    
    // Get the link text now.
    $positionCurrent = FindSubstringBetween( $content, $positionCurrent, '>', '</a>', $smurfyLinkEntry->linkText );
    if( $positionCurrent === false )
    {
      continue;
    }
    $smurfyLinkEntry->link = htmlspecialchars_decode( substr( $content, $smurfyLinkEntry->startPosition, $positionCurrent - $smurfyLinkEntry->startPosition ) );
    $smurfyLinkEntry->endPosition = $positionCurrent;
    
    $smurfyLinks[] = $smurfyLinkEntry;
  }
  
  return $smurfyLinks;
}

function FindSubstringBetween( $content, $posStart, $strStart, $strEnd, &$outputString )
{
  // Get the link text now.
  $internalStart = strpos( $content, $strStart, $posStart );
  if( $internalStart === false )
  {
    return false;
  }
  $internalEnd = strpos( $content, $strEnd, $internalStart );
  if( $internalEnd === false )
  {
    return false;
  }
  
  $outputString = substr( $content, $internalStart + strlen( $strStart ), $internalEnd - $internalStart - strlen( $strStart ) );
  return $internalEnd + strlen( $strEnd );
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
