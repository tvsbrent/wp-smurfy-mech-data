// RE-ENABLE TRY / CATCH BLOCK


var SmurfyApp = {
  urlBase: window.location.href,
  cachedChassis : {},
  cachedLoadouts : {},
  useCompactStats : false,
  useCompactComponents : false,
  Breakpoints : {
    stats       : 580,
    image       : 715,
    components  : 755 },
  AjaxSettings : function( url ) {
    this.url            = url;
    this.timeout        = 7500;
    this.type           = 'GET';
    this.async          = true;
    this.contentType    = "application/json";
    this.dataType       = 'json'; },
  DataID : function( chassisID, loadoutID )
  {
    this.chassis = chassisID;
    this.loadout = loadoutID; },
  errorMessage : {
    currentExpander : null,
    currentTimeOut : 0 },
  ExpanderBaseClass : 'dsmd-expander',
  ExpanderStateClasses : {
    'open'      : 'dsmd-expander-arrow-down',
    'close'     : 'dsmd-expander-arrow-up',
    'loading'   : 'dsmd-expander-loading',
    'error'     : 'dsmd-expander-error' },
  ImageState : {
    hidden  : 0,
    faded   : 1,
    visible : 2 },
  currentImageState : 2,
  PanelType : {
    stats       : 0,
    components  : 1 },
  Months : [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ]
};

SmurfyApp.DataID.prototype.key = function (){
  return this.chassis + ":" + this.loadout;
};

SmurfyApp.DataID.prototype.allURL = function(){
  return SmurfyApp.urlBase + "?display-smurfy-mech-data-all=" + this.chassis + ":" + this.loadout;
};

SmurfyApp.DataID.prototype.loadoutURL = function(){
  return SmurfyApp.urlBase + "?display-smurfy-mech-data-loadout=" + this.chassis + ":" + this.loadout;
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

  if( dataID.chassis === null || dataID.loadout === null ) {
    return false;
  }

  return true;
};

SmurfyApp.setExpanderState = function( expander, state ) {
  expander.attr( "class", SmurfyApp.ExpanderBaseClass + " " + SmurfyApp.ExpanderStateClasses[state] );
};

SmurfyApp.hasExpanderStateClasses = function( expander, state ) {
  return expander.hasClass( SmurfyApp.ExpanderStateClasses[state] );
};

SmurfyApp.handleError = function( expander, errorMsg ) {
  SmurfyApp.setExpanderState( expander, 'error' );
  expander.off( 'click' );
  expander.data( 'error-msg', errorMsg );
  expander.hover( function() { SmurfyApp.showExpanderError( jQuery( this ) ); },
                  function() { SmurfyApp.hideExpanderError(); } );
  // Initial display of the error.
  SmurfyApp.showExpanderError( expander );
};

SmurfyApp.showExpanderError = function( expander ) {
  // Clear any current timeouts.
  window.clearTimeout( SmurfyApp.errorMessage.currentTimeOut );

  if( SmurfyApp.errorMessage.currentExpander !== expander ) {
    SmurfyApp.errorMessage
      .text( expander.data( 'error-msg' ) )
      .currentExpander = expander;
    SmurfyApp.positionExpanderError( expander );
  }

  SmurfyApp.errorMessage
    .css( { "z-index": 10 } )
    .addClass( 'dsmd-expander-visible' );
};

SmurfyApp.hideExpanderError = function() {
  SmurfyApp.errorMessage
    .removeClass( 'dsmd-expander-visible' )
    .currentTimeOut = window.setTimeout( function() {
      SmurfyApp.errorMessage
        .css( { "z-index": -10 } )
        .currentExpander = null;
    }, 250 );
};

SmurfyApp.positionExpanderError = function( expander ) {
  var expanderOffset = expander.offset();

  SmurfyApp.errorMessage.css( {
    top: expanderOffset.top + ( expander.height() * 2 ),
    left: expanderOffset.left + expander.width() - SmurfyApp.errorMessage.width()
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

  if( SmurfyApp.errorMessage.currentExpander !== null ) {
    SmurfyApp.positionExpanderError( SmurfyApp.errorMessage.currentExpander );
  } else {
    SmurfyApp.errorMessage.css( { top: 0, left: 0 } );
  }

  // Potentially update anchor text.
  if( updateCompactStatsState ){
    var anchorUpdater = function( panelType, newText ) {
      jQuery('body').find( 'a[data-display-panel-type="' + panelType + '"]' ).text( newText );
    };
    if( SmurfyApp.useCompactStats ) {
      anchorUpdater( SmurfyApp.PanelType.stats, 'S' );
      anchorUpdater( SmurfyApp.PanelType.components, 'C' );
    } else {
      anchorUpdater( SmurfyApp.PanelType.stats, 'Stats' );
      anchorUpdater( SmurfyApp.PanelType.components, 'Components' );
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
      container.find('span:not(.dsmd-mech-image)').addClass('dsmd-compact');
      container.find('.dsmd-panel[data-panel-type="' + SmurfyApp.PanelType.stats + '"]')
        .children(':not(.dsmd-mech-image)')
          .addClass('dsmd-compact');
    } else {
      container.find('span:not(.dsmd-mech-image)').removeClass('dsmd-compact');
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
      //try {
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
      //} catch ( errorMsg ) {
        //SmurfyApp.handleError( expander, errorMsg );
      //}
    } );

    if( !SmurfyApp.getChassisAndLoadoutID( expander, dataID ) ){
      throw 'Failed to find Chassis or Loadout ID.';
    }

    // See if we cached the chassis data already.
    if( !SmurfyApp.cachedChassis.hasOwnProperty( dataID.chassis ) ) {
      // We need to get all the data, chassis and loadout.
      jQuery.ajax( new SmurfyApp.AjaxSettings( dataID.allURL() ) )
        .done( function( response, textStatus, jqXHR ) {
          SmurfyApp.cachedChassis[dataID.chassis] = response.chassis;
          SmurfyApp.cachedLoadouts[dataID.key()] = response.loadout;
          container.trigger( 'dataReady' );
        } )
        .fail( function( jqXHR, textStatus, errorThrown ) {
          SmurfyApp.handleError( expander, 'Failed to retrieve chassis and loadout data.' );
        } );
    } else if( !SmurfyApp.cachedLoadouts.hasOwnProperty( dataID.key() ) ) {
      jQuery.ajax( new SmurfyApp.AjaxSettings( dataID.loadoutURL() ) )
        .done( function( response ) {
          SmurfyApp.cachedLoadouts[dataID.key()] = response.loadout;
          container.trigger( 'dataReady' );
        } )
        .fail( function () {
          SmurfyApp.handleError( expander, 'Failed to retrieve loadout data.' );
        } );
    } else {
      container.trigger( 'dataReady' );
    }
  } catch ( errorMsg ) {
    SmurfyApp.handleError( expander, errorMsg );
  }
};

SmurfyApp.buildViewBody = function( container, dataID ) {
  var chassisData = SmurfyApp.cachedChassis[dataID.chassis],
      loadoutData = SmurfyApp.cachedLoadouts[dataID.key()],
      displayData = {
        isCompact           : SmurfyApp.useCompactStats,
        compactClass        : SmurfyApp.useCompactStats ? 'dsmd-compact' : ''
      };

  container.append( SmurfyApp.viewBodyTemplate( displayData ) );

  // Setup the anchor click handlers.
  container.find( 'a[data-display-panel-type]' ).on( 'click', SmurfyApp.anchorClickHandler );
};

SmurfyApp.appendMechStatsPanel = function( container, dataID ) {
  var chassisData = SmurfyApp.cachedChassis[dataID.chassis];
  var loadoutData = SmurfyApp.cachedLoadouts[dataID.key()];

  var viewBody = container.find('.dsmd-body');

  // Iterate over the armaments and add type
  _.each( loadoutData.stats.armaments, function(armament) {
    if( !armament.hasOwnProperty( 'weapon_type' ) &&
        SmurfyApp.mechItemDetails.hasOwnProperty( armament.id ) ) {
      armament.weapon_type = SmurfyApp.mechItemDetails[armament.id].weapon_type;
    } else {
      armament.weapon_type = 'unknown';
    }
  } );

  // Iterate over the ammuntion and add num shots
  _.each( loadoutData.stats.ammunition, function( ammo ){
    if( !ammo.hasOwnProperty( 'num_shots' ) &&
        SmurfyApp.mechItemDetails.hasOwnProperty( ammo.id ) ) {
      ammo.num_shots = ( SmurfyApp.mechItemDetails[ammo.id].num_shots || 0 ) * ammo.count;
    }
  } );

  // Determine if any electronics are installed.
  var hasElectronics = false,
    ecmInstalled = false,
    activeProbe = false,
    targetingComputer = undefined,
    commandConsole = false;
  _.each( loadoutData.stats.equipment, function( equipment ){
    var equipmentName = equipment.name.toLowerCase();
    if( equipmentName.indexOf('ecm') != -1 ){
      hasElectronics = true;
      ecmInstalled = true;
    } else if( equipmentName.indexOf('active probe') != -1 ){
      hasElectronics = true;
      activeProbe = true;
    } else if( equipmentName.indexOf('targeting comp') != -1 ){
      hasElectronics = true;
      targetingComputer = equipment.name;
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
      loadoutData = SmurfyApp.cachedLoadouts[dataID.key()],
      emptyCellValue = undefined;

  var buildPairedArray = function( component1Name, component2Name ) {
    var ret = [ [ ], [ ] ];

    var itemArray1 = [],
        itemArray2 = [];

    for( var i = 0, ticker = 0; i < loadoutData.configuration.length; ++i ) {
      if( loadoutData.configuration[i].name === component1Name ) {
        itemArray1 = loadoutData.configuration[i].items;
        ticker++;
      } else if ( loadoutData.configuration[i].name === component2Name ) {
        itemArray2 = loadoutData.configuration[i].items;
        ticker++;
      }
      if( ticker === 2 ) {
        break;
      }
    }

    var numElements = itemArray1.length >= itemArray2.length ? itemArray1.length : itemArray2.length;

    if( numElements === 0 ) {
      ret[0].push( emptyCellValue );
      ret[1].push( emptyCellValue );
    } else {
      for( var i = 0; i < numElements; ++i ) {
        if( i < itemArray1.length ) {
          ret[0].push( itemArray1[i].name );
        } else {
          ret[0].push( emptyCellValue );
        }
        if( i < itemArray2.length ) {
          ret[1].push( itemArray2[i].name );
        } else {
          ret[1].push( emptyCellValue );
        }
      }
    }

    return ret;
  };

  var buildArray = function( componentName ) {
    var ret = [];

    for( var i = 0; i < loadoutData.configuration.length; ++i ) {
      if( loadoutData.configuration[i].name === componentName ) {
        var itemArray = loadoutData.configuration[i].items;
        if( itemArray.length === 0 ) {
          ret.push( emptyCellValue );
        } else {
          for( var j = 0; j < itemArray.length; ++j ) {
            ret.push( itemArray[j].name );
          }
        }
        break;
      }
    }

    return ret;
  };

  var getArmor = function( componentName ) {
    for( var i = 0; i < loadoutData.configuration.length; ++i ) {
      if( loadoutData.configuration[i].name === componentName ) {
        return loadoutData.configuration[i].armor;
      }
    }
    return 0;
  };

  var displayData = {
    legsItems             : buildPairedArray( "right_leg", "left_leg" ),
    armsItems             : buildPairedArray( "right_arm", "left_arm" ),
    torsosItems           : buildPairedArray( "right_torso", "left_torso" ),
    centerItems           : buildArray( "centre_torso" ),
    headItems             : buildArray( "head" ),
    rightLegArmor         : getArmor( "right_leg" ),
    leftLegArmor          : getArmor( "left_leg" ),
    rightArmArmor         : getArmor( "right_arm" ),
    leftArmArmor          : getArmor( "left_arm" ),
    rightTorsoArmor       : getArmor( "right_torso" ),
    rightRearTorsoArmor   : getArmor( "right_torso_rear"),
    leftTorsoArmor        : getArmor( "left_torso" ),
    leftRearTorsoArmor    : getArmor( "left_torso_rear"),
    centerTorsoArmor      : getArmor( "centre_torso" ),
    centerRearTorsoArmor  : getArmor( "centre_torso_rear"),
    headArmor             : getArmor( "head")
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

SmurfyApp.anchorClickHandler = function( e ) {
  e.preventDefault();
  var anchor = jQuery(this),
      selectedType = anchor.data('display-panel-type'),
      container = anchor.closest('.dsmd-container' ),
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

  var mySpan = anchor.closest('span' ),
      allAnchors = mySpan.find('a');
  allAnchors.removeClass('active');
  anchor.addClass('active');

  if( SmurfyApp.updateImageState( container.width() ) ) {
    SmurfyApp.resizeContainerElements( container, true, false, false );
  }

  container.attr( 'data-selected-panel', selectedType );
};

jQuery( document ).ready( function() {
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

  // create the error msg div
  jQuery('body').append( SmurfyApp.errorTemplate() );
  SmurfyApp.errorMessage = jQuery.extend( SmurfyApp.errorMessage, jQuery( '#dsmd-expander-error') );

  // Setup the container event handlers
  jQuery('.dsmd-container')
    .on( 'toggleState', function() {
      var container = jQuery( this );
      container.toggleClass( 'dsmd-expanded' );
      if( !SmurfyApp.Modernizr.csstransitions || !container.hasClass( 'dsmd-animation' ) ) {
        container.trigger( 'transitionend' );
      }
    } )
    .on( 'transitionend', function() {
      var container = jQuery( this );
      var expander = container.find( '.dsmd-expander' );
      if( SmurfyApp.hasExpanderStateClasses( expander, 'loading' ) ||
          SmurfyApp.hasExpanderStateClasses( expander, 'open' ) ) {
        SmurfyApp.setExpanderState( expander, 'close' );
        container.find('.dsmd-view-buttons').removeClass('dsmd-hidden');
      } else {
        SmurfyApp.setExpanderState( expander, 'open' );
        container.find('.dsmd-view-buttons').addClass('dsmd-hidden');
      }
      expander.on( 'click', SmurfyApp.expanderClickHandler );
      container.removeClass( 'dsmd-animation' );
    } );

  jQuery( '.dsmd-expander' ).on( 'click', SmurfyApp.expanderClickHandler );

  // The window resize event handler.
  var resizeID;
  jQuery(window).resize( function() {
    clearTimeout( resizeID );
    resizeID = setTimeout( SmurfyApp.handleResizeComplete, 200 );
  });

} );

//////////////////////////////////////////////////////////////
// TEMPLATES

SmurfyApp.errorTemplate = _.template('<div id="dsmd-expander-error" class="dsmd-expander-errormsg"></div>');

SmurfyApp.viewBodyTemplate = _.template(' \
  <div class="dsmd-body"> \
    <span class="dsmd-view-buttons dsmd-hidden"> \
      <ul> \
        <li><a href="#" title="Stats" class="active" data-display-panel-type="<%= SmurfyApp.PanelType.stats %>">\
          <%= isCompact ? "S" : "Stats" %> \
        </a></li> \
        <li><a href="#" title="Components" data-display-panel-type="<%= SmurfyApp.PanelType.components %>">\
          <%= isCompact ? "C" : "Components" %> \
        </a></li> \
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
    <%= SmurfyApp.cellMechComponentTemplate( { title: "Right Arm", items: armsItems[0], armor: rightArmArmor, rearArmor: undefined, isCompact: false } ) %> \
  </div><div class="dsmd-subpanel dsmd-column"> \
    <div style="height: 15px"></div> \
    <%= SmurfyApp.cellMechComponentTemplate( { title: "Right Torso", items: torsosItems[0], armor: rightTorsoArmor, rearArmor: rightRearTorsoArmor, isCompact: false } ) %> \
    <%= SmurfyApp.cellMechComponentTemplate( { title: "Right Leg", items: legsItems[0], armor: rightLegArmor, rearArmor: undefined, isCompact: false } ) %> \
  </div><div class="dsmd-subpanel dsmd-column"> \
    <%= SmurfyApp.cellMechComponentTemplate( { title: "Head", items: headItems, armor: headArmor, rearArmor: undefined, isCompact: false } ) %> \
    <%= SmurfyApp.cellMechComponentTemplate( { title: "Center Torso", items: centerItems, armor: centerTorsoArmor, rearArmor: centerRearTorsoArmor, isCompact: false } ) %> \
  </div><div class="dsmd-subpanel dsmd-column"> \
    <div style="height: 15px"></div> \
    <%= SmurfyApp.cellMechComponentTemplate( { title: "Left Torso", items: torsosItems[1], armor: leftTorsoArmor, rearArmor: leftRearTorsoArmor, isCompact: false } ) %> \
    <%= SmurfyApp.cellMechComponentTemplate( { title: "Left Leg", items: legsItems[1], armor: leftLegArmor, rearArmor: undefined, isCompact: false } ) %> \
  </div><div class="dsmd-subpanel dsmd-column"> \
    <div style="height: 30px"></div> \
    <%= SmurfyApp.cellMechComponentTemplate( { title: "Left Arm", items: armsItems[1], armor: leftArmArmor, rearArmor: undefined, isCompact: false } ) %> \
  </div> \
</div>');

SmurfyApp.panelMechComponentsCompactTemplate = _.template( '\
  <div class="dsmd-panel dsmd-compact" data-panel-type="<%= SmurfyApp.PanelType.components %>"> \
    <div class="dsmd-subpanel dsmd-compact"> \
      <%= SmurfyApp.cellMechComponentTemplate( { title: "Head", items: headItems, armor: headArmor, rearArmor: undefined, isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { title: "Center Torso", items: centerItems, armor: centerTorsoArmor, rearArmor: centerRearTorsoArmor, isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { title: "Right Torso", items: torsosItems[0], armor: rightTorsoArmor, rearArmor: rightRearTorsoArmor, isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { title: "Left Torso", items: torsosItems[1], armor: leftTorsoArmor, rearArmor: leftRearTorsoArmor, isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { title: "Right Arm", items: armsItems[0], armor: rightArmArmor, rearArmor: undefined, isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { title: "Left Arm", items: armsItems[1], armor: leftArmArmor, rearArmor: undefined, isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { title: "Right Leg", items: legsItems[0], armor: rightLegArmor, rearArmor: undefined, isCompact: true } ) %> \
      <%= SmurfyApp.cellMechComponentTemplate( { title: "Left Leg", items: legsItems[1], armor: leftLegArmor, rearArmor: undefined, isCompact: true } ) %> \
    </div> \
  </div>');

SmurfyApp.cellMechComponentTemplate = _.template(
  '<div class="dsmd-column-cell"> \
     <ul> \
       <li class="dsmd-li-title"><%= title %>&nbsp;<span class="dsmd-label dsmd-label-info"><%= armor %> \
       <% if( rearArmor !== undefined ) { %> \
         (<%= rearArmor %>) \
       <% } %></span></li> \
       <%  _.each( items, function( item ) { \
            if( item === undefined ) { \
              if( isCompact ) { \
                return true; \
              } else { %> \
                <li>&nbsp;</li> \
       <%     } \
            } else { %> \
              <li><%= item %></li> \
       <%   } \
          } ); %> \
     </ul> \
   </div>');