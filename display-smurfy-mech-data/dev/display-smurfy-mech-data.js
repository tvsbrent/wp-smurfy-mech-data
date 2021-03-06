var SmurfyApp = {
  urlBase: window.location.href,
  cachedChassis : {},
  cachedLoadouts : {},
  cachedWeapons : {},
  cachedAmmo : {},
  cachedOmnipods : {},
  cachedModules : {},
  currentEquipmmentDataState : 0,
  EquipmentDataState : {
    'unknown'   : 0,
    'loading'   : 1,
    'available' : 2,
    'error'     : 3 },
  useCompactStats : false,
  useCompactComponents : false,
  Breakpoints : {
    stats       : 580,
    image       : 715,
    components  : 755 },
  AjaxSettings : function( url ) {
    this.url            = url;
    this.type           = 'GET';
    this.async          = true;
    this.contentType    = "application/json";
    this.ifModified     = false;
    this.dataType       = 'json'; },
  DataID : function( chassisID, loadoutID ) {
    this.chassis = chassisID;
    this.loadout = loadoutID; },
  MechComponent : function () {
    this.name         = undefined;
    this.omnipodName  = undefined;
    this.equipment    = [];
    this.armor        = []; },
  messageBox : {
    currentExpander : null,
    currentTimeOut : 0 },
  ExpanderBaseStyle : 'dsmd-expander',
  ExpanderStateStyle : {
    'open'      : 'dsmd-expander-arrow-down',
    'close'     : 'dsmd-expander-arrow-up',
    'loading'   : 'dsmd-expander-loading',
    'error'     : 'dsmd-expander-error',
    'disabled'  : 'dsmd-expander-arrow-down-disabled' },
  ImageState : {
    hidden  : 0,
    faded   : 1,
    visible : 2 },
  currentImageState : 2,
  PanelType : {
    stats       : 0,
    components  : 1 },
  Months : [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ],
  chrome : {
    extensionModeActive : false },
};

SmurfyApp.DataID.prototype.key = function (){
  return this.chassis + ":" + this.loadout;
};

SmurfyApp.DataID.prototype.urlAll = function(){
  return SmurfyApp.urlBase + "?display-smurfy-mech-data-all=" + this.chassis + ":" + this.loadout;
};

SmurfyApp.DataID.prototype.urlLoadout = function(){
  return SmurfyApp.urlBase + "?display-smurfy-mech-data-loadout=" + this.chassis + ":" + this.loadout;
};

SmurfyApp.MechComponent.prototype.getLoadoutIndex = function( loadoutData, componentName ) {
  for( var i = 0; i < loadoutData.configuration.length; ++i ) {
    if( loadoutData.configuration[i].name === componentName ) {
      return i;
    }
  }
  return undefined;
};

SmurfyApp.MechComponent.ComponentNames = {
  'head'          : [ 'Head',         'H' ],
  'centre_torso'  : [ 'Center Torso', 'CT' ],
  'left_torso'    : [ 'Left Torso',   'LT' ],
  'right_torso'   : [ 'Right Torso',  'RT' ],
  'left_arm'      : [ 'Left Arm',     'LA' ],
  'right_arm'     : [ 'Right Arm',    'RA' ],
  'left_leg'      : [ 'Left Leg',     'LL' ],
  'right_leg'     : [ 'Right Leg',    'RL' ]
};

SmurfyApp.MechComponent.prototype.build = function ( chassisData, loadoutData, componentName ) {
  var componentIndex = this.getLoadoutIndex( loadoutData, componentName );
  if( componentIndex === undefined ) {
    return;
  }

  var component = loadoutData.configuration[componentIndex];

  if( component.hasOwnProperty( 'omni_pod' ) ) {
    var omnipodID = component['omni_pod'];
    if( omnipodID > 0 ){
      // Get the family from the chassis data and look up this omnipod.
      var omnipods = SmurfyApp.cachedOmnipods[chassisData['family']];
      this.omnipodName = omnipods[omnipodID].details.translatedName;
      // Shorten the name.
      this.omnipodName = this.omnipodName.replace(SmurfyApp.MechComponent.ComponentNames[componentName][0].toUpperCase(), '' );
    }
  }

  // Build up the equipment array.
  var equipmentArray = component.items;
  if( equipmentArray.length === 0 && this.equipment.length === 0 ) {
    this.equipment.push( undefined );
  } else {
    for( var j = 0; j < equipmentArray.length; ++j ) {
      var entry = {
        name : equipmentArray[j].name,
        style : 'info'
      };

      entry.name = entry.name.replace('CLAN ', 'C. ');

      // We need to determine style of the entry.
      var id = equipmentArray[j].id;
      // See if it's a weapon.
      if( SmurfyApp.cachedWeapons.hasOwnProperty( id ) ){
        entry.style = SmurfyApp.cachedWeapons[id].type.toLowerCase();
        if( entry.style == 'missle' ) {
          entry.style = 'missile';
        }
        entry.style = 'mech-hardpoint-' + entry.style;
      } else if( SmurfyApp.cachedAmmo.hasOwnProperty( id ) ) {
        entry.style = 'ammo';
      } else if( SmurfyApp.cachedModules.hasOwnProperty( id ) ) {
        switch( SmurfyApp.cachedModules[id].type ){
          case 'CHeatSinkStats':
            if( entry.name.indexOf('DOUBLE') > -1 ) {
              entry.name = entry.name.replace( 'HEAT SINK', 'HS' );
            }
            entry.style = 'hs';
            break;
          case 'CTargetingComputerStats':
            entry.name = entry.name.replace( 'TARGETING COMP.', 'T. COMP.' );
            // NOTE: deliberately not breaking here.
          case 'CGECMStats':
          case 'CBAPStats':
          case 'CClanBAPStats':
          case 'CMASCStats':
            entry.style = 'mech-hardpoint-tech';
            break;
        }
      }

      this.equipment.push( entry );
    }
  }

  // Build the armor array.
  this.armor.push( component.armor );
  if( componentName.indexOf( 'torso' ) > -1 ) {
    var rearComponentIndex = this.getLoadoutIndex( loadoutData, componentName + "_rear" );
    if( rearComponentIndex !== undefined ) {
      this.armor.push( loadoutData.configuration[rearComponentIndex].armor );
    }
  }

  this.name = SmurfyApp.MechComponent.ComponentNames[componentName][0];

};

SmurfyApp.MechComponent.balanceEquipmentLengths = function( component1, component2 ) {
  var maxLength = component1.equipment.length > component2.equipment.length ? component1.equipment.length : component2.equipment.length;
  while( component1.equipment.length < maxLength ) {
    component1.equipment.push( undefined );
  }
  while( component2.equipment.length < maxLength ) {
    component2.equipment.push( undefined );
  }
};

SmurfyApp.roundValue = function( value ) {
  return Math.round((value + 0.00001) * 100) / 100;
};

SmurfyApp.parseCreateDate = function( createDate ) {
  // 2014-11-29T03:07:35+000
  var s = (createDate.substr( 0, createDate.indexOf('T') )).split('-');
  return SmurfyApp.Months[ s[1] - 1 ] + " " + s[2] + ", " + s[0];
};

SmurfyApp.parseUri = function( str ) {
  var	o   = SmurfyApp.parseUri.options,
      m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
      uri = {},
      i   = 14;

  while (i--) uri[o.key[i]] = m[i] || "";

  uri[o.q.name] = {};
  uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
    if ($1) uri[o.q.name][$1] = $2;
  });

  return uri;
};

SmurfyApp.parseUri.options = {
  strictMode: false,
  key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
  q:   {
    name:   "queryKey",
    parser: /(?:^|&)([^&=]*)=?([^&]*)/g
  },
  parser: {
    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
  }
};

SmurfyApp.getURLParameter = function ( url, name ) {
  return( RegExp( name + '=' + '(.+?)(&|$)' ).exec(url) || [,null] )[1];
};

SmurfyApp.getChassisAndLoadoutID = function( expander, dataID ) {
  var sibs = expander.siblings( 'a' );
  for( var i = 0, url = ''; i < sibs.length; ++i ) {
    url = jQuery( sibs[i] ).attr( 'href' );
    dataID.chassis = this.getURLParameter( url, 'i' );
    dataID.loadout = this.getURLParameter( url, 'l' );
    break;
  }

  if( dataID.chassis === undefined || dataID.loadout === undefined ) {
    return false;
  }

  return true;
};

SmurfyApp.setExpanderState = function( expander, state ) {
  expander.attr( "class", SmurfyApp.ExpanderBaseStyle + " " + SmurfyApp.ExpanderStateStyle[state] );
};

SmurfyApp.hasExpanderStateStyle = function( expander, state ) {
  return expander.hasClass( SmurfyApp.ExpanderStateStyle[state] );
};

SmurfyApp.handleError = function( expander, errorMsg ) {
  SmurfyApp.setExpanderState( expander, 'error' );
  expander.off( 'click' );
  expander.data( 'error-msg', errorMsg );
  expander.hover( function() { SmurfyApp.showExpanderMessage( jQuery( this ) ); },
                  function() { SmurfyApp.hideExpanderMessage(); } );
  // Initial display of the error.
  SmurfyApp.showExpanderMessage( expander );
};

SmurfyApp.showExpanderMessage = function( expander, message ) {
  // Clear any current timeouts.
  window.clearTimeout( SmurfyApp.messageBox.currentTimeOut );

  if( SmurfyApp.messageBox.currentExpander !== expander ) {
    if( message == undefined ) {
      message = expander.data( 'error-msg' );
    }
    SmurfyApp.messageBox
      .text( message )
      .currentExpander = expander;
    SmurfyApp.positionExpanderMessage( expander );
  }

  SmurfyApp.messageBox
    .css( { "z-index": 10 } )
    .addClass( 'dsmd-expander-visible' );
};

SmurfyApp.hideExpanderMessage = function() {
  SmurfyApp.messageBox
    .removeClass( 'dsmd-expander-visible' )
    .currentTimeOut = window.setTimeout( function() {
      SmurfyApp.messageBox
        .css( { "z-index": -10 } )
        .currentExpander = null;
    }, 250 );
};

SmurfyApp.positionExpanderMessage = function( expander ) {
  var expanderOffset = expander.offset();

  SmurfyApp.messageBox.css( {
    top: expanderOffset.top + ( expander.height() * 2 ),
    left: expanderOffset.left + expander.width() - SmurfyApp.messageBox.width()
  } );
};

SmurfyApp.handleResizeComplete = function() {
  var isFirst = true;
  var updatedImageState = false,
      updateCompactStatsState = false,
      updateCompactComponentState = false;

  jQuery('.dsmd-container').each( function() {
    if( isFirst ) {
      isFirst = false;
      // Just check one container's width, they'll all be this size.
      var containerWidth = jQuery( this ).width();

      updatedImageState = SmurfyApp.updateImageState( containerWidth );
      updateCompactStatsState = SmurfyApp.updateCompactStatsState( containerWidth );
      updateCompactComponentState = SmurfyApp.updateCompactComponentState( containerWidth );

      if( !updatedImageState && !updateCompactStatsState && !updateCompactComponentState ) {
        // Neither state changed, so leave.
        // Returning false breaks the each loop.
        return false;
      }
    }
    SmurfyApp.resizeContainerElements( jQuery( this ), updatedImageState, updateCompactStatsState, updateCompactComponentState );
  } );

  if( SmurfyApp.messageBox.currentExpander !== null ) {
    SmurfyApp.positionExpanderMessage( SmurfyApp.messageBox.currentExpander );
  } else {
    SmurfyApp.messageBox.css( { top: 0, left: 0 } );
  }

  // Potentially update view button text.
  if( updateCompactStatsState ){
    var buttonUpdater = function( panelType, newText ) {
      jQuery('body').find( 'div[data-display-panel-type="' + panelType + '"]' ).text( newText );
    };
    if( SmurfyApp.useCompactStats ) {
      buttonUpdater( SmurfyApp.PanelType.stats, 'S' );
      buttonUpdater( SmurfyApp.PanelType.components, 'C' );
    } else {
      buttonUpdater( SmurfyApp.PanelType.stats, 'Stats' );
      buttonUpdater( SmurfyApp.PanelType.components, 'Components' );
    }
  }
};

SmurfyApp.updateImageState = function( containerWidth ) {
  // Return true if the state changed
  if( containerWidth >= SmurfyApp.Breakpoints.image && SmurfyApp.currentImageState != SmurfyApp.ImageState.visible ) {
    SmurfyApp.currentImageState = SmurfyApp.ImageState.visible;
    return true;
  } else if ( containerWidth < SmurfyApp.Breakpoints.image && SmurfyApp.currentImageState != SmurfyApp.ImageState.faded ) {
    SmurfyApp.currentImageState = SmurfyApp.ImageState.faded;
    return true;
  }
  return false;
};

SmurfyApp.updateCompactStatsState = function( containerWidth ){
  // Return true if a state changed
  if( containerWidth < SmurfyApp.Breakpoints.stats && !SmurfyApp.useCompactStats ) {
    SmurfyApp.useCompactStats = true;
    return true;
  }
  else if( containerWidth >= SmurfyApp.Breakpoints.stats && SmurfyApp.useCompactStats ) {
    SmurfyApp.useCompactStats = false;
    return true;
  }
  return false;
};

SmurfyApp.updateCompactComponentState = function( containerWidth ){
  // Return true if a state changed
  if( containerWidth < SmurfyApp.Breakpoints.components && !SmurfyApp.useCompactComponents ) {
    SmurfyApp.useCompactComponents = true;
    return true;
  } else if ( containerWidth >= SmurfyApp.Breakpoints.components && SmurfyApp.useCompactComponents ) {
    SmurfyApp.useCompactComponents = false;
    return true;
  }
  return false;
};

SmurfyApp.resizeContainerElements = function( container, updatedImageFadedState, updatedCompactState, updatedCompactComponentsState ) {

  if( updatedImageFadedState ) {
    switch( SmurfyApp.currentImageState ){
      case SmurfyApp.ImageState.hidden:
        container.find('.dsmd-mech-image')
          .addClass('dsmd-hidden')
          .removeClass('dsmd-compact');
        break;
      case SmurfyApp.ImageState.faded:
        container.find('.dsmd-mech-image')
          .addClass('dsmd-compact')
          .removeClass('dsmd-hidden');
        break;
      case SmurfyApp.ImageState.visible:
        container.find('.dsmd-mech-image')
          .removeClass('dsmd-compact')
          .removeClass('dsmd-hidden');
        break;
      default:
        throw "Unsupported image state!";
        break;
    }
  }

  if( updatedCompactState ) {
    if( SmurfyApp.useCompactStats ) {
      container.find('.dsmd-label-stats-armor').addClass('dsmd-compact');
      container.find('.dsmd-panel[data-panel-type="' + SmurfyApp.PanelType.stats + '"]')
        .children(':not(.dsmd-mech-image)')
          .addClass('dsmd-compact');
    } else {
      container.find('.dsmd-label-stats-armor').removeClass('dsmd-compact');
      container.find('.dsmd-panel[data-panel-type="' + SmurfyApp.PanelType.stats + '"]')
        .children(':not(.dsmd-mech-image)')
          .removeClass('dsmd-compact');
    }
  }

  if( updatedCompactComponentsState ) {
    var selectedPanel = container.attr('data-selected-panel');
    if( selectedPanel == SmurfyApp.PanelType.components ) {
      // We have two different views for compact versus normal.
      // All we need to do here is check for the existence of the appropriate view
      var panelCompact = container.find( '.dsmd-panel.dsmd-compact[data-panel-type="' + SmurfyApp.PanelType.components + '"]' ),
          panelNormal = container.find( '.dsmd-panel:not(.dsmd-compact)[data-panel-type="' + SmurfyApp.PanelType.components + '"]' ),
          panelSwitcher = function( panelOld, panelNew ) {
            panelOld.addClass( 'dsmd-hidden' );
            if( !panelNew.length ) {
              var dataID = new SmurfyApp.DataID( container.data( 'chassis-id' ), container.data( 'loadout-id' ) );
              container.append( SmurfyApp.appendMechComponentsPanel( container, dataID ) );
            } else {
              panelNew.removeClass( 'dsmd-hidden' );
            }
          };

      if( SmurfyApp.useCompactComponents ) {
        panelSwitcher( panelNormal, panelCompact );
      } else {
        panelSwitcher( panelCompact, panelNormal );
      }
    }
  }
};

SmurfyApp.getMechData = function( container, expander ) {
  try {
    var dataID = new SmurfyApp.DataID();

    container.on( 'dataReady', function() {
      container.off( 'dataReady' );
      try {
        SmurfyApp.buildViewBody( container, dataID );
        SmurfyApp.appendMechStatsPanel( container, dataID );
        container
          .attr( 'data-selected-panel', SmurfyApp.PanelType.stats )
          .attr( 'data-chassis-id', dataID.chassis )
          .attr( 'data-loadout-id', dataID.loadout );
        window.setTimeout( function() {
          container
            .attr( 'data-built-view', 'true' )
            .trigger( 'viewBuilt' );
        }, 250 );
      } catch ( errorMsg ) {
        SmurfyApp.handleError( expander, errorMsg );
      }
    } );

    if( !SmurfyApp.getChassisAndLoadoutID( expander, dataID ) ) {
      throw 'Failed to find Chassis or Loadout ID.';
    }

    var handleResponse = function( response ) {
      if( !response.success ) {
        SmurfyApp.handleError( expander, 'Failed to retrieve chassis and loadout data.' );
        return;
      }
      if( response.hasOwnProperty( "chassis" ) ) {
        SmurfyApp.cachedChassis[dataID.chassis] = response.chassis;
      }
      var responseJson = response.loadout;
      SmurfyApp.cachedLoadouts[dataID.key()] = responseJson;
      container.trigger( 'dataReady' );
    };

    // Prep the chrome extension request method.
    var sendChromeRequest = function( requestChassis ) {
      chrome.runtime.sendMessage(
        { type            : "fetchBuild",
          chassisID       : dataID.chassis,
          loadoutID       : dataID.loadout,
          requestChassis  : requestChassis },
        function( response ) {
          handleResponse( response );
        } );
    };

    // See if we cached the chassis data already.
    if( !SmurfyApp.cachedChassis.hasOwnProperty( dataID.chassis ) ) {
      if( SmurfyApp.chrome.extensionModeActive ) {
        sendChromeRequest( true );
      } else {
        // We issue a request to a our url, which will then fetch the data
        // from Smurfy's site. In this case, we need to get all the data,
        // chassis and loadout.
        jQuery.ajax( new SmurfyApp.AjaxSettings( dataID.urlAll() ) )
          .done( function( response, textStatus, jqXHR ) {
            response.success = true;
            handleResponse( response );
          } )
          .fail( function( jqXHR, textStatus, errorThrown ) {
            handleResponse( { success: false } );
          } );
      }
    } else if( !SmurfyApp.cachedLoadouts.hasOwnProperty( dataID.key() ) ) {
      if( SmurfyApp.chrome.extensionModeActive ) {
        sendChromeRequest( false );
      } else {
        jQuery.ajax( new SmurfyApp.AjaxSettings( dataID.urlLoadout() ) )
          .done( function( response ) {
            response.success = true;
            handleResponse( response );
          } )
          .fail( function( jqXHR, textStatus, errorThrown ) {
            handleResponse( { success : false } );
          } );
      }
    } else {
      // We have all the data cached.
      container.trigger( 'dataReady' );
    }
  } catch ( errorMsg ) {
    SmurfyApp.handleError( expander, errorMsg );
  }
};

SmurfyApp.buildViewBody = function( container, dataID ) {
  var displayData = {
        isCompact           : SmurfyApp.useCompactStats,
        compactClass        : SmurfyApp.useCompactStats ? 'dsmd-compact' : ''
      };

  container.append( SmurfyApp.viewBodyTemplate( displayData ) );

  // Setup the view button click handlers.
  container.find( 'div[data-display-panel-type]' ).on( 'click', SmurfyApp.viewButtonClickHandler );
};

SmurfyApp.appendMechStatsPanel = function( container, dataID ) {
  var chassisData = SmurfyApp.cachedChassis[dataID.chassis];
  var loadoutData = SmurfyApp.cachedLoadouts[dataID.key()];

  var viewBody = container.find('.dsmd-body');

  // Iterate over the armaments and add type
  _.each( loadoutData.stats.armaments, function(armament) {
    if( !armament.hasOwnProperty( 'weapon_type' ) &&
        SmurfyApp.cachedWeapons.hasOwnProperty( armament.id ) ) {
      armament.weapon_type = SmurfyApp.cachedWeapons[armament.id].type.toLowerCase();
      if( armament.weapon_type === 'missle' ) {
        // There's a typo in the data we receive, change it to 'missile'.
        armament.weapon_type = 'missile';
      }
    } else {
      armament.weapon_type = 'unknown';
    }
  } );

  // Iterate over the ammuntion and add num shots
  _.each( loadoutData.stats.ammunition, function( ammo ){
    if( !ammo.hasOwnProperty( 'num_shots' ) &&
        SmurfyApp.cachedAmmo.hasOwnProperty( ammo.id ) ) {
      ammo.num_shots = ( SmurfyApp.cachedAmmo[ammo.id].num_shots || 0 ) * ammo.count;
    }
  } );

  // Determine if any electronics are installed.
  var hasElectronics = false,
    ecmInstalled = false,
    activeProbe = false,
    targetingComputer = undefined,
    masc = undefined,
    commandConsole = false;
  _.each( loadoutData.stats.equipment, function( equipment ){
    var equipmentName = equipment.name.toLowerCase();
    if( equipmentName.indexOf('ecm') != -1 ){
      hasElectronics = true;
      ecmInstalled = true;
    } else if( equipmentName.indexOf('active probe') != -1 ){
      hasElectronics = true;
      activeProbe = true;
    } else if( equipmentName.indexOf('targeting comp') != -1 ) {
      hasElectronics = true;
      targetingComputer = equipment.name;
    } else if( equipmentName.indexOf('masc mk') != -1 ) {
      hasElectronics = true;
      masc = equipment.name;
    } else if( equipmentName.indexOf('command console') != -1 ){
      hasElectronics = true;
      commandConsole = true;
    }
  } );

  // Build the upgrades array
  var upgrades = [];
  _.each( loadoutData.upgrades, function( upgrade ){
    var upgradeName = upgrade.name.toLowerCase();
    if( upgradeName.indexOf('standard') == -1 ){
      switch( upgrade.type ){
        case 'Armor':
          upgrades.push( { category: 'Armor', name: 'Ferro-Fibrous' } );
          break;
        case 'Structure':
          upgrades.push( { category: 'Structure', name: 'Endo-Steel' } );
          break;
        case 'HeatSink':
          upgrades.push( { category: 'Heat Sinks', name: 'Double' } );
          break;
        case 'Artemis':
          upgrades.push( { category: 'Guidance', name: 'Artemis' } );
          break;
      }
    }
  } );

  var displayData = {
    compactClass        : SmurfyApp.useCompactStats ? 'dsmd-compact' : '',
    shortName           : chassisData.translated_short_name,
    imgVisibilityClass  : SmurfyApp.currentImageState == SmurfyApp.ImageState.faded ? 'dsmd-compact' : '',
    imgSrc              : 'http://mwo.smurfy-net.de/assetic/img/tt_image/' + chassisData.name + '.png',
    isStock             : dataID.loadout.toLowerCase() === 'stock',
    usedArmor           : loadoutData.stats.used_armor,
    maxArmor            : chassisData.details.max_armor,
    firepower           : loadoutData.stats.firepower,
    dpsSustained        : SmurfyApp.roundValue(loadoutData.stats.dps_sustained),
    dpsMax              : SmurfyApp.roundValue(loadoutData.stats.dps_max),
    coolingEfficiency   : loadoutData.stats.cooling_efficiency,
    topSpeed            : loadoutData.stats.top_speed ? SmurfyApp.roundValue( loadoutData.stats.top_speed ) : 0,
    topSpeedTweak       : loadoutData.stats.top_speed_tweak ? SmurfyApp.roundValue( loadoutData.stats.top_speed_tweak ): 0,
    movementArchetype   : chassisData.details.tuning_config.MovementArchetype,
    armaments           : loadoutData.stats.armaments,
    engineType          : loadoutData.stats.engine_type,
    engineRating        : loadoutData.stats.engine_rating,
    jumpJets            : (loadoutData.stats.used_jump_jets || 0) + (loadoutData.stats.granted_jump_jets || 0 ),
    jumpJetsMax         : chassisData.details.jump_jets,
    heatSinks           : loadoutData.stats.heatsinks || 0,
    hasElectronics      : hasElectronics,
    ecmInstalled        : ecmInstalled,
    activeProbe         : activeProbe,
    targetingComputer   : targetingComputer,
    masc                : masc,
    commandConsole      : commandConsole,
    ammunition          : loadoutData.stats.ammunition,
    upgrades            : upgrades,
    isValid             : loadoutData.valid,
    createdDate         : SmurfyApp.parseCreateDate( loadoutData.created_at )
  };

  viewBody.append( SmurfyApp.panelMechStatsTemplate( displayData ) );
};

SmurfyApp.appendMechComponentsPanel = function( container, dataID ){
  var chassisData = SmurfyApp.cachedChassis[dataID.chassis],
      loadoutData = SmurfyApp.cachedLoadouts[dataID.key()];

  var mechComponents = {};
  for( var key in SmurfyApp.MechComponent.ComponentNames ) {
    if( SmurfyApp.MechComponent.ComponentNames.hasOwnProperty( key ) ) {
      mechComponents[key] = new SmurfyApp.MechComponent();
      mechComponents[key].build( chassisData, loadoutData, key );
    }
  }

  if( !SmurfyApp.useCompactComponents ) {
    // Make sure that the left / right components have the same length
    SmurfyApp.MechComponent.balanceEquipmentLengths( mechComponents['left_torso'], mechComponents['right_torso'] );
    SmurfyApp.MechComponent.balanceEquipmentLengths( mechComponents['left_arm'], mechComponents['right_arm'] );
    SmurfyApp.MechComponent.balanceEquipmentLengths( mechComponents['left_leg'], mechComponents['right_leg'] );
  }

  var displayData = {
    components : mechComponents
  };

  if( SmurfyApp.useCompactComponents ) {
    container.find('.dsmd-body').append( SmurfyApp.panelMechComponentsCompactTemplate( displayData ) );
  } else {
    container.find('.dsmd-body').append( SmurfyApp.panelMechComponentsTemplate( displayData ) );
  }
};

SmurfyApp.expanderClickHandler = function() {
  var expander = jQuery( this );
  var container = expander.closest( '.dsmd-container' );

  // Turn off the click handler, if all goes well, we'll
  // turn it back on later.
  expander.off( 'click' );

  if( container.hasClass( 'dsmd-container-expanded' ) ) {
    // We are expanded, close.
    container.trigger( 'toggleState' );
  } else {
    // See if we need to get the data from Smurfy.
    var hasBuiltView = container.attr( 'data-built-view' );
    if( hasBuiltView == 'true' ) {
      // We have already built the view, open.
      container.trigger( 'toggleState' );
    } else {
      SmurfyApp.setExpanderState( expander, 'loading' );
      // Data has not been built for this container, let's get to it.
      SmurfyApp.getMechData( container, expander );
      container.on( 'viewBuilt', function() {
        container.trigger( 'toggleState' );
      } );
    }
  }
};

SmurfyApp.viewButtonClickHandler = function( e ) {
  var button = jQuery(this),
      selectedType = button.data('display-panel-type'),
      container = button.closest('.dsmd-container'),
      currentType = container.attr('data-selected-panel');

  if( selectedType == currentType ) {
    return;
  }

  var newPanel = container.find( ( selectedType == SmurfyApp.PanelType.components && SmurfyApp.useCompactComponents ? '.dsmd-compact' : ':not(.dsmd-compact)' ) + '[data-panel-type=' + selectedType + ']' ),
      currentPanel = container.find( '[data-panel-type=' + currentType + ']' ),
      dataID = new SmurfyApp.DataID( container.data('chassis-id'), container.data('loadout-id') );

  currentPanel.addClass( 'dsmd-hidden' );

  switch( selectedType ){
    case SmurfyApp.PanelType.stats:
      if( !newPanel.length ) {
        container.append( SmurfyApp.appendMechStatsPanel( container, dataID ) );
      } else {
        newPanel.removeClass( 'dsmd-hidden' );
      }
      break;
    case SmurfyApp.PanelType.components:
      if( !newPanel.length ){
        container.append( SmurfyApp.appendMechComponentsPanel( container, dataID ) );
      } else {
        newPanel.removeClass( 'dsmd-hidden' );
      }
      break;
    default:
      throw "Unsupported panel type.";
  }

  var mySpan = button.closest('span'),
      allButtons = mySpan.find('.dsmd-view-button');
  allButtons.removeClass('dsmd-view-button-active');
  button.addClass('dsmd-view-button-active');

  if( SmurfyApp.updateImageState( container.width() ) ) {
    SmurfyApp.resizeContainerElements( container, true, false, false );
  }

  container.attr( 'data-selected-panel', selectedType );
};

SmurfyApp.getEquipmentData = function() {

  // Get the cached data, either locally or from Smurfy.

  // Since we may be requesting the data from the chrome extension,
  // which will respond asynchronously, we have to separate our
  // response / validation of the cached data from the request.
  var validateCachedData = function( cachedTime ) {
    var expireTime = new Date();

    // We consider the data as having expired after 46 hours.
    expireTime.setHours( expireTime.getHours() - 46 );

    var cachedDataValid = false;
    if( cachedTime > expireTime ) {
      try {
        // Check to make sure each cached element is valid.
        var isValid = function( cachedData ) {
          if( cachedData === undefined || cachedData === null ){
            return false;
          }
          for( var prop in cachedData ) {
            if( cachedData.hasOwnProperty( prop ) ) {
              return true;
            }
          }
          return false;
        };
        cachedDataValid = isValid( SmurfyApp.cachedWeapons ) &&
        isValid( SmurfyApp.cachedAmmo ) &&
        isValid( SmurfyApp.cachedOmnipods ) &&
        isValid( SmurfyApp.cachedModules );
      } catch( ex ) {
        // any errors will trigger a reload of the data below.
      }
    }
    if( cachedDataValid ) {
      SmurfyApp.updateEquipmentDataState( SmurfyApp.EquipmentDataState.available );
    } else {
      SmurfyApp.loadEquipmentData();
    }
  };

  // Now request the cached data.
  if( SmurfyApp.chrome.extensionModeActive ) {
    chrome.runtime.sendMessage(
      { type : "getCachedEquipment",
        items :
        [
          'cached-weapons',
          'cached-ammo',
          'cached-omnipods',
          'cached-modules',
          'cached-time'
        ] },
      function( response ) {
        SmurfyApp.cachedWeapons   = JSON.parse( response['cached-weapons'] );
        SmurfyApp.cachedAmmo      = JSON.parse( response['cached-ammo'] );
        SmurfyApp.cachedOmnipods  = JSON.parse( response['cached-omnipods'] );
        SmurfyApp.cachedModules   = JSON.parse( response['cached-modules'] );
        var cachedTime = new Date( response['cached-time'] );

        validateCachedData( cachedTime );
      } );
  } else {
    SmurfyApp.cachedWeapons   = JSON.parse( localStorage.getItem( 'cached-weapons' ) );
    SmurfyApp.cachedAmmo      = JSON.parse( localStorage.getItem( 'cached-ammo' ) );
    SmurfyApp.cachedOmnipods  = JSON.parse( localStorage.getItem( 'cached-omnipods' ) );
    SmurfyApp.cachedModules   = JSON.parse( localStorage.getItem( 'cached-modules' ) );
    var cachedTime = new Date( localStorage.getItem( 'cached-time' ) );

    validateCachedData( cachedTime );
  }
};

SmurfyApp.updateEquipmentDataState = function( newState ) {
  if( newState === SmurfyApp.EquipmentDataState.unknown ) {
    return;
  }

  SmurfyApp.hideExpanderMessage();

  var expanders = jQuery( '.dsmd-expander' );

  switch( newState ) {
    case SmurfyApp.EquipmentDataState.error:
    {
      SmurfyApp.setExpanderState( expanders, 'disabled' );
      expanders
        .off( 'mouseenter mouseleave' )
        .hover( function() { SmurfyApp.showExpanderMessage( jQuery( this ), "Failed to load shared equipment data!" ); },
                function() { SmurfyApp.hideExpanderMessage(); } );
    }
    break;
    case SmurfyApp.EquipmentDataState.available:
    {
      SmurfyApp.setExpanderState( expanders, 'open' );
      expanders
        .off( 'mouseenter mouseleave' )
        .on( 'click', SmurfyApp.expanderClickHandler );
    }
    break;
    case SmurfyApp.EquipmentDataState.loading:
    {
      SmurfyApp.setExpanderState( expanders, 'disabled' );
      expanders
        .hover( function() { SmurfyApp.showExpanderMessage( jQuery( this ), "Loading shared equipment data..." ); },
                function() { SmurfyApp.hideExpanderMessage(); } );
    }
    break;
  }

  SmurfyApp.currentEquipmmentDataState = newState;
};

SmurfyApp.loadEquipmentData = function() {

  SmurfyApp.updateEquipmentDataState( SmurfyApp.EquipmentDataState.loading );

  var requestEquipment = function ( equipmentType, equipmentCacheName ) {
    if( SmurfyApp.chrome.extensionModeActive ) {
      chrome.runtime.sendMessage(
        { type : "requestEquipmentType", equipmentType : equipmentType },
        function( response ) {
          cacheEquipment( response.data, equipmentType, equipmentCacheName );
        }
      );
    } else {
      jQuery.ajax( new SmurfyApp.AjaxSettings( SmurfyApp.urlBase + "?display-smurfy-mech-equipment=" + equipmentType ) )
        .done( function( response, textStatus, jqXHR ) {
          localStorage.setItem( 'cached-' + equipmentType, JSON.stringify( response ) );
          cacheEquipment( response, equipmentType, equipmentCacheName );
        } )
        .fail( function() {
          SmurfyApp.updateEquipmentDataState( SmurfyApp.EquipmentDataState.error );
          console.log( "Failed to load " + equipmentType + " data." );
        } );
    }
  };

  // This will cache the equipment.
  var completedRequests = 0;
  var cacheEquipment = function( response, equipmentType, equipmentCacheName ) {
    SmurfyApp[equipmentCacheName] = response;
    ++completedRequests;
    if( completedRequests === 4 ) {
      var timestamp = new Date().toString();
      if( SmurfyApp.chrome.extensionModeActive ) {
        chrome.runtime.sendMessage( { type: 'setLocalStorageItem', itemName: 'cached-time', item: timestamp } );
      } else {
        localStorage.setItem( 'cached-time', timestamp );
      }
      SmurfyApp.updateEquipmentDataState( SmurfyApp.EquipmentDataState.available );
    }
  };

  requestEquipment( 'weapons',  'cachedWeapons' );
  requestEquipment( 'ammo',     'cachedAmmo' );
  requestEquipment( 'omnipods', 'cachedOmnipods' );
  requestEquipment( 'modules',  'cachedModules' );
};

SmurfyApp.initialize = function( ActivateChromeExtensionMode ) {

  if( ActivateChromeExtensionMode !== null ) {
    SmurfyApp.chrome.extensionModeActive = ActivateChromeExtensionMode;
  }

  // Grab a single container object. If none exist, then we'll
  // just leave, as there's nothing on this page for us.
  var singleContainer = jQuery('.dsmd-container').first();
  if( singleContainer.length === 0 ){
    return;
  }

  // Set the initial image / compact state.
  SmurfyApp.updateImageState( singleContainer.width() );
  SmurfyApp.updateCompactStatsState( singleContainer.width() );
  SmurfyApp.updateCompactComponentState( singleContainer.width() );

  var urlBaseOverride = jQuery('body').attr('data-url-base');
  if( urlBaseOverride !== undefined ) {
    SmurfyApp.urlBase = urlBaseOverride;
  }

  // Parse the url and pull out only the parts we need,
  // ignoring any query strings.
  var uri = SmurfyApp.parseUri( SmurfyApp.urlBase );
  SmurfyApp.urlBase = uri.protocol + "://" + uri.authority + uri.path + uri.file;

  // create the msg div
  jQuery('body').append( SmurfyApp.messageBoxTemplate() );
  SmurfyApp.messageBox = jQuery.extend( SmurfyApp.messageBox, jQuery( '#dsmd-expander-message') );

  SmurfyApp.getEquipmentData();

  // Setup the container event handlers
  jQuery('.dsmd-container')
    .on( 'toggleState', function() {
      var container = jQuery( this );
      container.toggleClass( 'dsmd-expanded' );
      if( !container.hasClass( 'dsmd-animation' ) ) {
        container.trigger( 'transitionState' );
      } else {
        window.setTimeout( function() {
          container.trigger( 'transitionState' );
        }, 400 ); // This time needs to match the animation time in the stylesheet
      }
    } )
    .on( 'transitionState', function() {
      var container = jQuery( this );
      var expander = container.find( '.dsmd-expander' );
      if( SmurfyApp.hasExpanderStateStyle( expander, 'loading' ) ||
          SmurfyApp.hasExpanderStateStyle( expander, 'open' ) ) {
        SmurfyApp.setExpanderState( expander, 'close' );
        container.find('.dsmd-view-buttons').removeClass('dsmd-hidden');
      } else {
        SmurfyApp.setExpanderState( expander, 'open' );
        container.find('.dsmd-view-buttons').addClass('dsmd-hidden');
      }
      expander.on( 'click', SmurfyApp.expanderClickHandler );
      container.removeClass( 'dsmd-animation' );
    } );

  // The window resize event handler.
  var resizeID;
  jQuery(window).resize( function() {
    clearTimeout( resizeID );
    resizeID = setTimeout( SmurfyApp.handleResizeComplete, 200 );
  });

};

// jQuery initialization.
jQuery( document ).ready( function() {
  if( window.chrome &&
      chrome.runtime &&
      chrome.runtime.id ) {
    // This code is being run as part of a Chrome extension.
    // Let it call for the initialize.
    SmurfyApp.chrome.extensionModeActive = true;
    return;
  }

  SmurfyApp.initialize();
} );

//////////////////////////////////////////////////////////////
// TEMPLATES

SmurfyApp.messageBoxTemplate = _.template('<div id="dsmd-expander-message" class="dsmd-expander-msg"></div>');

SmurfyApp.viewBodyTemplate = _.template(' \
  <div class="dsmd-body"> \
    <span class="dsmd-view-buttons dsmd-hidden"> \
      <ul> \
        <li><div class="dsmd-view-button dsmd-view-button-active" data-display-panel-type="<%= SmurfyApp.PanelType.stats %>">\
          <%= isCompact ? "S" : "Stats" %> \
        </div></li> \
        <li><div class="dsmd-view-button" data-display-panel-type="<%= SmurfyApp.PanelType.components %>">\
          <%= isCompact ? "C" : "Components" %> \
        </div></li> \
      </ul> \
    </span>\
  </div>');

SmurfyApp.panelMechStatsTemplate = _.template(' \
  <div class="dsmd-panel <%= compactClass %>" data-panel-type="<%= SmurfyApp.PanelType.stats %>"> \
    <span class="dsmd-mech-image <%= imgVisibilityClass %>"> \
      <img src="<%= imgSrc %>"> \
    </span>\
    <span class="dsmd-status <%= compactClass %> <% if ( !isValid ) { %>dsmd-invalid<% } %>"> Created: <%= createdDate %><% if ( !isValid ) { %> (Invalid)<% } %></span> \
    <div class="dsmd-subpanel <%= compactClass %>"> \
      <ul> \
        <li class="dsmd-li-title">Stats</li> \
        <li>Chassis: <span class="dsmd-label dsmd-label-info"><%  if( isStock === true ) { %>Stock <% } %><%= shortName %> \
        </span></li> \
        <li>Armor: <span class="dsmd-label dsmd-label-dmg"><%= usedArmor %> / <%= maxArmor %></span></li> \
        <li>Firepower: <span class="dsmd-label dsmd-label-dmg"><%= firepower %></span></li> \
        <li>Sustained DPS: <span class="dsmd-label dsmd-label-dps"><%= dpsSustained %> dps</span></li> \
        <li>Max DPS: <span class="dsmd-label dsmd-label-dps"><%= dpsMax %> dps</span></li> \
        <li>Cool. Eff.: <span class="dsmd-label dsmd-label-cooling"><%= coolingEfficiency %>%</span></li> \
        <li>Move. Archetype: <span class="dsmd-label dsmd-label-info"><%= movementArchetype %></span></li> \
        <li>Speed: <span class="dsmd-label dsmd-label-info"><%= topSpeed %> kph</span></li> \
        <li>&nbsp; <span class="dsmd-label dsmd-label-success"><%= topSpeedTweak %> kph</span></li> \
      </ul> \
    </div> \
    \
    <div class="dsmd-subpanel <%= compactClass %>"> \
      <ul> \
        <li class="dsmd-li-title">Armaments</li> \
        <%  if( armaments === undefined || armaments.length == 0 ) { %> \
              <li><em>None</em></li> \
        <%  } else {  \
              _.each( armaments, function( armament ){ %> \
                <li><%= armament.name %>&nbsp;<span class="dsmd-label dsmd-label-mech-hardpoint-<%= armament.weapon_type %>"><%= armament.count %></span></li> \
        <%    } );  \
            } %> \
        <li class="dsmd-li-title">Equipment</li> \
        <li>Engine: \
        <%  if( engineType === undefined ) { %> \
              <span class="dsmd-label dsmd-label-warning">No Engine</span> \
        <%  } else {  %> \
              <span class="dsmd-label dsmd-label-info"><%= engineType %> <%= engineRating %></span> \
        <%  } %> \
        </li> \
        <li>Heatsinks: \
        <%  if( heatSinks === 0 ) { %> \
              <span class="dsmd-label dsmd-label-warning">0</span> \
        <%  } else {  %> \
              <span class="dsmd-label dsmd-label-hs"><%= heatSinks %></span> \
        <%  } %> \
        </li> \
        <%  if( jumpJetsMax !== undefined && jumpJetsMax > 0 ) { %> \
              <li>Jump Jets: <span class="dsmd-label dsmd-label-info"><%= jumpJets %> of <%= jumpJetsMax %></span></li> \
        <%  } %> \
        <%  if( hasElectronics === true ) { %> \
            <li class="dsmd-li-title">Electronic Systems</li> \
        <%  } %> \
        <%  if( ecmInstalled === true ) { %> \
              <li>&nbsp;<span class="dsmd-label dsmd-label-left dsmd-label-info">ECM</span></li> \
        <%  } %> \
        <%  if( activeProbe === true ) { %> \
              <li>&nbsp;<span class="dsmd-label dsmd-label-left dsmd-label-info">Active Probe</span></li> \
        <%  } %> \
        <%  if( targetingComputer !== undefined ) { %> \
              <li>&nbsp;<span class="dsmd-label dsmd-label-left dsmd-label-info"><%= targetingComputer %></span></li> \
        <%  } %> \
        <%  if( masc !== undefined ) { %> \
            <li>&nbsp;<span class="dsmd-label dsmd-label-left dsmd-label-info"><%= masc %></span></li> \
        <%  } %> \
        <%  if( commandConsole === true ) { %> \
              <li>&nbsp;<span class="dsmd-label dsmd-label-left dsmd-label-info">Command Console</span></li> \
        <%  } %> \
      </ul> \
    </div> \
    \
    <div class="dsmd-subpanel <%= compactClass %>"> \
      <ul> \
        <li class="dsmd-li-title">Ammunition</li> \
        <%  if( ammunition === undefined || ammunition.length == 0 ) { %> \
              <li><em>None</em></li> \
        <%  } else {  \
              _.each( ammunition, function( ammo ) { %> \
                <li><%= ammo.name %>&nbsp;<span class="dsmd-label dsmd-label-success"><%= ammo.num_shots %></span></li> \
        <%    } );  \
            } %> \
        <%  if( upgrades.length > 0 ) { %> \
            <li class="dsmd-li-title">Upgrades</li> \
        <%    _.each( upgrades, function( upgrade ) { %> \
                <li><%= upgrade.category %>&nbsp;<span class="dsmd-label dsmd-label-success"><%= upgrade.name %></span></li> \
        <%    } ); \
            } %> \
      </ul> \
    </div> \
  </div>' );

SmurfyApp.panelMechComponentsTemplate = _.template(' \
<div class="dsmd-panel dsmd-column" data-panel-type="<%= SmurfyApp.PanelType.components %>"> \
  <div class="dsmd-subpanel dsmd-column"> \
    <div style="height: 30px"></div> \
    <%= SmurfyApp.cellMechComponentTemplate( { component: components["right_arm"], isCompact: false } ) %> \
  </div><div class="dsmd-subpanel dsmd-column"> \
    <div style="height: 15px"></div> \
    <%= SmurfyApp.cellMechComponentTemplate( { component: components["right_torso"], isCompact: false } ) %> \
    <%= SmurfyApp.cellMechComponentTemplate( { component: components["right_leg"], isCompact: false } ) %> \
  </div><div class="dsmd-subpanel dsmd-column"> \
    <%= SmurfyApp.cellMechComponentTemplate( { component: components["head"], isCompact: false } ) %> \
    <%= SmurfyApp.cellMechComponentTemplate( { component: components["centre_torso"], isCompact: false } ) %> \
  </div><div class="dsmd-subpanel dsmd-column"> \
    <div style="height: 15px"></div> \
    <%= SmurfyApp.cellMechComponentTemplate( { component: components["left_torso"], isCompact: false } ) %> \
    <%= SmurfyApp.cellMechComponentTemplate( { component: components["left_leg"], isCompact: false } ) %> \
  </div><div class="dsmd-subpanel dsmd-column"> \
    <div style="height: 30px"></div> \
    <%= SmurfyApp.cellMechComponentTemplate( { component: components["left_arm"], isCompact: false } ) %> \
  </div> \
</div>');

SmurfyApp.panelMechComponentsCompactTemplate = _.template( '\
  <div class="dsmd-panel dsmd-compact" data-panel-type="<%= SmurfyApp.PanelType.components %>"> \
    <div class="dsmd-subpanel dsmd-compact"> \
      <%= SmurfyApp.cellMechComponentTemplate( { component: components["head"], isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { component: components["centre_torso"], isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { component: components["right_torso"], isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { component: components["left_torso"], isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { component: components["right_arm"], isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { component: components["left_arm"], isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { component: components["right_leg"], isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { component: components["left_leg"], isCompact: true } ) %> \
    </div> \
  </div>');

SmurfyApp.cellMechComponentTemplate = _.template(
  '<div class="dsmd-column-cell"> \
     <ul> \
       <li class="dsmd-li-title"><%= component.name %>&nbsp;<span class="dsmd-label dsmd-label-info dsmd-label-stats-armor">\
       <%= component.armor[0] %><% if( component.armor.length == 2 ) { %> (<%= component.armor[1] %>)<% } %></span></li> \
      <% if( component.omnipodName !== undefined ) { %> \
        <li>Omnipod <span class="dsmd-label dsmd-label-info"><%= component.omnipodName %></span></li> \
       <% } %> \
       <%  _.each( component.equipment, function( item ) { \
            if( item === undefined ) { \
              if( isCompact ) { \
                return true; \
              } else { %> \
                <li>&nbsp;</li> \
       <%     } \
            } else { %> \
              <li><span class="dsmd-label dsmd-label-left <% if( !isCompact ) { %>dsmd-label-column <% }%>dsmd-label-<%= item.style %>"><%= item.name %></span>&nbsp;</li> \
       <%   } \
          } ); %> \
     </ul> \
   </div>');