<?php
/**
 * @package Smurfy_Mech_Data
 * @version 1.0
 */
/*
Plugin Name: Display Smurfy Mech Data
Author: Brent Schmidt
Version: 1.0
*/

namespace SmurfyMechData;

include 'smurfy-item-data.php';

/* DEBUG STUFF - POSSIBLY LATER */
ini_set('display_errors', 'On');
error_reporting(E_ALL | E_STRICT);

/* ADD SCRIPTS */
add_action( 'init', 'SmurfyMechData\\AddScripts' );
function AddScripts()
{
  if( !is_admin() )
  {
    wp_register_script('display-smurfy-mech-data', plugins_url( '/display-smurfy-mech-data.js', __FILE__ ), array('jquery'), '1.0', true );
    wp_enqueue_script('display-smurfy-mech-data');
  }
}

/* ADD STYLES */
add_action( 'wp_enqueue_scripts', 'SmurfyMechData\\AddStyles' );
function AddStyles()
{
  if( !is_admin() )
  {
    wp_register_style( 'display-smurfy-mech-data', plugins_url( '/display-smurfy-mech-data.css', __FILE__ ), array(), '1.0', 'all' );
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
  // variable are modified, these values are meaningless.
  public $startPosition = 0;
  public $endPosition = 0;
}

add_filter( 'the_content', 'SmurfyMechData\\ModifyContent' );
function ModifyContent( $content )
{ 
  // For now, we only want this to display on the single
  // post pages.
  if( !is_single() )
  {
    return $content;
  }
  
  $smurfyLinks = FindSmurfyLinks( $content );
  
  if( !empty( $smurfyLinks ) )
  {
    // We'll use this to get some data later.
    $itemData = getItemData();
    
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
      
      $smurfyData = GetSmurfyData( $value, $itemData );
      if( $smurfyData === false )
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
      
      $newContent .= $left . $smurfyData;
      
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

function GetSmurfyData( $smurfyLink, $itemData )
{
  try {
    $json = @file_get_contents( sprintf( 'http://mwo.smurfy-net.de/api/data/mechs/%s.json', $smurfyLink->chassisID ) );
    if( $json === false )
    {
      return false;
    }
    $chassis = json_decode( $json ); 
    
    $json = @file_get_contents( sprintf( 'http://mwo.smurfy-net.de/api/data/mechs/%s/loadouts/%s.json', $smurfyLink->chassisID, $smurfyLink->loadoutID ) );
    if( $json === false )
    {
      return false;
    }
    $loadout = json_decode( $json );     
  }
  catch( Exception $ex ) {
    return false;
  } 
  
  // Some variables we need to figure out prior to going into the body.  
  $createdDate = date( 'F j, Y H:i', strtotime( $loadout->{'created_at'} ) );
   
  // Engine Items
  $engineItem = '';
  $speedItem = '';
  $speedItemFormat = '<li>Speed: <span class="dsmd-label dsmd-label-info">%d kph</span></li>' .
                     '<li>&nbsp; <span class="dsmd-label dsmd-label-success">%d kph</span></li>';
  if( !property_exists( $loadout->{'stats'}, 'engine_rating' ) ) {
    $engineItem = '<span class="dsmd-label dsmd-label-warning">No Engine</span>';
    $speedItem = sprintf($speedItemFormat, 0, 0);
  }
  else
  {
    $engineItem = sprintf('<span class="dsmd-label dsmd-label-info">%s %s</span>',
                          $loadout->{'stats'}->{'engine_type'},
                          $loadout->{'stats'}->{'engine_rating'});
    $speedItem = sprintf($speedItemFormat, $loadout->{'stats'}->{'top_speed'}, $loadout->{'stats'}->{'top_speed_tweak'});
  }
  
  // Jump Jets Item
  $jumpJetsItem = '';
  if( $chassis->{'details'}->{'jump_jets'} > 0 ) {
    $jumpJetsItem = sprintf('<li>Jump Jets: <span class="dsmd-label dsmd-label-info">%s of %s</span></li>',
                            $loadout->{'stats'}->{'used_jump_jets'} + $loadout->{'stats'}->{'granted_jump_jets'},
                            $chassis->{'details'}->{'jump_jets'} );
  }
  
  // Heat Sinks Item
  $heatsinksItem = '';
  if( !property_exists( $loadout->{'stats'}, 'heatsinks' ) ) {
    $heatsinksItem = '<span class="dsmd-label dsmd-label-warning">0</span>';
  } else {
    $heatsinksItem = sprintf( '<span class="dsmd-label dsmd-label-hs">%d</span>',
                              $loadout->{'stats'}->{'heatsinks'} );
  }
  
  // ECM & Active Probe Items
  $ecmItem = '';
  $activeProbeItem = '';
  foreach( $loadout->{'stats'}->{'equipment'} as $equipment ) {
    if( strpos( $equipment->{'name'}, 'ECM' ) !== false ) {
      $ecmItem = '<li>ECM: <span class="dsmd-label dsmd-label-info">Installed</span></li>';
    }
    else if( strpos( $equipment->{'name'}, 'ACTIVE PROBE') !== false ) {
      $activeProbeItem = '<li>Active Probe: <span class="dsmd-label dsmd-label-info">Installed</span></li>';    
    }
  }
  
  // Active Probe Item
  
  foreach( $loadout->{'stats'}->{'equipment'} as $equipment ) {
    if( strpos( $equipment->{'name'}, 'ECM' ) !== false ) {
      $ecmItem = '<li>ECM: <span class="dsmd-label dsmd-label-info">Installed</span></li>';
      break;
    }
  }
  
  // Armaments Items
  $armamentsItems = '';
  if( empty( $loadout->{'stats'}->{'armaments'} ) ) {
    $armamentsItems = '<li><em>None</em></li>';
  }
  else
  {
    foreach( $loadout->{'stats'}->{'armaments'} as $armament ) {
      $labelClass = '';
      if( isset( $itemData[$armament->{'id'}] ) ) {
        $labelClass = 'dsmd-label-mech-hardpoint-' . $itemData[$armament->{'id'}]['weapon_type'];
      }
      $armamentsItems .= sprintf( '<li>%s&nbsp;<span class="dsmd-label %s">%d</span></li>',
                                  $armament->{'name'},
                                  $labelClass,
                                  $armament->{'count'} );
    }
  }
  
  // Ammunition Items
  $ammunitionItems = '';
  if( empty( $loadout->{'stats'}->{'ammunition'} ) ) {
    $ammunitionItems = '<li><em>None</em></li>';
  }
  else
  {
    foreach( $loadout->{'stats'}->{'ammunition'} as $ammo ) {
      $ammoAmount = $ammo->{'count'};
      if( isset( $itemData[$ammo->{'id'}] ) ) {
        $ammoAmount *= $itemData[$ammo->{'id'}]['num_shots'];
      }
      $ammunitionItems .= sprintf('<li>%s&nbsp;<span class="dsmd-label dsmd-label-success">%d</span></li>',
                                  $ammo->{'name'},
                                  $ammoAmount );
    }
  }
  
  // Upgrades
  $upgradeItems = '';
  foreach( $loadout->{'upgrades'} as $upgrade ) {
    if( strpos( $upgrade->{'name'},'STANDARD' ) === false ) {
      $upgradeCat = '';
      $upgradeName = '';
      switch( $upgrade->{'type'} ) {
        case 'Armor':
          $upgradeCat = 'Armor';
          $upgradeName = 'Ferro-Fibrous';
          break;
        case 'Structure':
          $upgradeCat = 'Structure';
          $upgradeName = 'Endo-Steel';
          break;
        case 'HeatSink':
          $upgradeCat = 'Heat Sinks';
          $upgradeName = 'Double';
          break;
        case 'Artemis':
          $upgradeCat = 'Guidance';
          $upgradeName = 'Artemis';
          break;
      }
      
      if( !empty( $upgradeName ) ) {
        $upgradeItems .= sprintf( '<li>%s&nbsp;<span class="dsmd-label dsmd-label-info">%s</span></li>',
                                  $upgradeCat, $upgradeName ); 
      }
    }
  }
  if( !empty( $upgradeItems ) )
  {
    $upgradeItems = '<li class="dsmd-li-title">Upgrades</li>' . $upgradeItems;
  }
  
  $imgSrc = 'http://mwo.smurfy-net.de/assetic/img/tt_image/' . $chassis->{'name'} . '.png';
  
  // Validity values
  $statusValidClass = '';
  $statusValidText = '';
  if( $loadout->{'valid'} !== true ) {
    $statusValidClass = 'dsmd-status-invalid';  
    $statusValidText = ' (Loadout Invalid!)';
  }
  
  $dpsMax = round( $loadout->{'stats'}->{'dps_max'}, 2 );
  $dpsSustained = round( $loadout->{'stats'}->{'dps_sustained'}, 2 );
  
  $body =
<<<EOD
  <div class="dsmd-container">
    <div class="dsmd-title">
      {$smurfyLink->link}
      <span class="dsmd-expander dsmd-arrow-down"></span>
    </div>
    <span class="dsmd-mech-image">
      <img src="$imgSrc">
    </span>
    <div class="dsmd-panel">
      <ul>
        <li class="dsmd-li-title">Stats</li>
        <li>Chassis: <span class="dsmd-label dsmd-label-info">{$chassis->{'translated_short_name'}}</span></li>
        <li>Armor: <span class="dsmd-label dsmd-label-dmg">{$loadout->{'stats'}->{'used_armor'}} / {$chassis->{'details'}->{'max_armor'}}</span></li>
        <li>Firepower: <span class="dsmd-label dsmd-label-dmg">{$loadout->{'stats'}->{'firepower'}}</span></li>
        <li>Sustained DPS: <span class="dsmd-label dsmd-label-dps"> $dpsSustained dps</span></li>
        <li>Max DPS: <span class="dsmd-label dsmd-label-dps">$dpsMax dps</span></li>
        <li>Cool. Eff.: <span class="dsmd-label dsmd-label-cooling">{$loadout->{'stats'}->{'cooling_efficiency'}}%</span></li>
        $speedItem\n
      </ul>
    </div>

    <div class="dsmd-panel">
      <ul>
        <li class="dsmd-li-title">Armaments</li>
        $armamentsItems
        <li class="dsmd-li-title">Equipment</li>
        <li>Engine: $engineItem</li>
        <li>Heatsinks: $heatsinksItem</li>
        $jumpJetsItem
        $ecmItem
        $activeProbeItem
      </ul>
    </div>

    <div class="dsmd-panel">
      <ul>
        <li class="dsmd-li-title">Ammunition</li>
        $ammunitionItems
        $upgradeItems
      </ul>
    </div>
    <span class="dsmd-status $statusValidClass"> Created on $createdDate$statusValidText</span>
  </div>\n
EOD;

  return $body;
}
?>
