var SmurfyApp = {
  urlBase: window.location.href,
  cachedChassis : {},
  cachedLoadouts : {},
  isCompact : false,
  isImageFaded : false,
  AjaxSettings : function( url ) {
    this.url            = url;
    this.timeout        = 7500;
    this.type           = 'GET';
    this.async          = true;
    this.contentType    = "application/json";
    this.dataType       = 'json';
  },
  DataID : function( chassisID, loadoutID )
  {
    this.chassis = chassisID;
    this.loadout = loadoutID;
  },
  errorMessage : {
    currentExpander : null,
    currentTimeOut : 0
  },
  ExpanderBaseClass : 'dsmd-expander',
  ExpanderStateClasses : {
    'open'      : 'dsmd-expander-arrow-down',
    'close'     : 'dsmd-expander-arrow-up',
    'loading'   : 'dsmd-expander-loading',
    'error'     : 'dsmd-expander-error'
  },
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
  var expanderOffset = expander.offset();

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
    .addClass( 'dsmd-visible' );
};

SmurfyApp.hideExpanderError = function() {
  SmurfyApp.errorMessage
    .removeClass( 'dsmd-visible' )
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
  var updatedImageFadedState = false;
  var updateCompactState = false;

  jQuery('.dsmd-container').each( function() {
    if( isFirst ) {
      isFirst = false;
      // Just check one container's width, they'll all be this size.
      var containerWidth = jQuery( this ).width();

      updatedImageFadedState = SmurfyApp.updateImageFadedState( containerWidth );
      updateCompactState = SmurfyApp.updateCompactState( containerWidth );

      if( !updatedImageFadedState && !updateCompactState ) {
        // The compact state didn't change, so leave.
        // Returning false breaks the each loop.
        return false;
      }
    }
    jQuery(this).children('.dsmd-panel-container' ).each( function() {
      SmurfyApp.resizePanelContainerElements( jQuery( this ), updatedImageFadedState, updateCompactState );
    } );
  } );

  if( SmurfyApp.errorMessage.currentExpander !== null ) {
    SmurfyApp.positionExpanderError( SmurfyApp.errorMessage.currentExpander );
  } else {
    SmurfyApp.errorMessage.css( { top: 0, left: 0 } );
  }
};

SmurfyApp.updateImageFadedState = function( containerWidth ) {
  if( containerWidth >= 715 && SmurfyApp.isImageFaded ) {
    SmurfyApp.isImageFaded = false;
    return true;
  } else if ( containerWidth < 715 && !SmurfyApp.isImageFaded ) {
    SmurfyApp.isImageFaded = true;
    return true;
  }
  return false;
};

SmurfyApp.updateCompactState = function( containerWidth ){
  // Return true if the state changed
  if( containerWidth < 560 && !SmurfyApp.isCompact ) {
    SmurfyApp.isCompact = true;
    return true;
  }
  else if( containerWidth >= 560 && SmurfyApp.isCompact ) {
    SmurfyApp.isCompact = false;
    return true;
  }
  return false;
};

SmurfyApp.resizePanelContainerElements = function( panelContainer, updatedImageFadedState, updateCompactState ) {
  if( updatedImageFadedState ) {
    if( SmurfyApp.isImageFaded ) {
      panelContainer.children('.dsmd-mech-image')
        .addClass('dsmd-compact');
    } else {
      panelContainer.children('.dsmd-mech-image')
        .removeClass('dsmd-compact');
    }
  }

  if( updateCompactState ) {
    if( SmurfyApp.isCompact ) {
      panelContainer
        .children(':not(.dsmd-mech-image)')
          .addClass('dsmd-compact');
    } else {
      panelContainer
        .children(':not(.dsmd-mech-image)')
          .removeClass('dsmd-compact');
    }
  }
};

SmurfyApp.getMechData = function( container, expander ) {
  try {
    var dataID = new SmurfyApp.DataID();

    container.on( 'dataReady', function() {
      container.off( 'dataReady' );
      try {
        SmurfyApp.buildMechDataView( container, dataID );
      } catch ( errorMsg ) {
        SmurfyApp.handleError( expander, errorMsg );
      }
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

SmurfyApp.buildMechDataView = function( container, dataID ) {
  var chassisData = SmurfyApp.cachedChassis[dataID.chassis];
  var loadoutData = SmurfyApp.cachedLoadouts[dataID.key()];

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

  var parsedDate = SmurfyApp.parseCreateDate( loadoutData.created_at );

  var displayData = {
    compactClass        : SmurfyApp.isCompact ? 'dsmd-compact' : '',
    imgVisibilityClass  : SmurfyApp.isImageFaded ? 'dsmd-compact' : '',
    imgSrc              : 'http://mwo.smurfy-net.de/assetic/img/tt_image/' + chassisData.name + '.png',
    shortName           : chassisData.translated_short_name,
    isStock             : dataID.loadout.toLowerCase() === 'stock',
    usedArmor           : loadoutData.stats.used_armor,
    maxArmor            : chassisData.details.max_armor,
    firepower           : loadoutData.stats.firepower,
    dpsSustained        : SmurfyApp.roundValue(loadoutData.stats.dps_sustained),
    dpsMax              : SmurfyApp.roundValue(loadoutData.stats.dps_max),
    coolingEfficiency   : loadoutData.stats.cooling_efficiency,
    topSpeed            : loadoutData.stats.top_speed ? SmurfyApp.roundValue( loadoutData.stats.top_speed ) : 0,
    topSpeedTweak       : loadoutData.stats.top_speed_tweak ? SmurfyApp.roundValue( loadoutData.stats.top_speed_tweak ): 0,
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
    createdDate         : parsedDate
  };

  container
    .append( SmurfyApp.mechDataView( displayData ) )
    .attr( 'data-built-view', true );

  // We'll wait a moment to give the DOM time to build
  // all the elements.
  window.setTimeout( function() {
    container.trigger('viewBuilt');
  }, 250 );
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
      SmurfyApp.setExpanderState( expander, 'loading');
      // Data has not been built for this container, let's get to it.
      container.on( 'viewBuilt', function() {
        container.trigger( 'toggleState' );
      } );
      SmurfyApp.getMechData( container, expander );
    }
  }
};

jQuery( document ).ready( function() {
  // Grab a single container object. If none exist, then we'll
  // just leave, as there's nothing on this page for us.
  var singleContainer = jQuery('.dsmd-container').first();
  if( singleContainer.length === 0 ){
    return;
  }

  // Set the initial faded / compact state.
  SmurfyApp.updateImageFadedState( singleContainer.width() );
  SmurfyApp.updateCompactState( singleContainer.width() );

  var urlBaseOverride = jQuery('body' ).attr('data-url-base');
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
  jQuery( '.dsmd-container' )
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
        SmurfyApp.setExpanderState( expander, 'close');
      } else {
        SmurfyApp.setExpanderState( expander, 'open');
      }
      expander.on( 'click', SmurfyApp.expanderClickHandler );
      container.removeClass('dsmd-animation');
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

SmurfyApp.errorTemplate = _.template('<div id="dsmd-expander-error" class="dsmd-expander-errormsg dsmd-hidden"></div>');

SmurfyApp.mechDataView = _.template(' \
  <div class="dsmd-panel-container <%= compactClass %>"> \
    <span class="dsmd-mech-image <%= imgVisibilityClass %>"> \
      <img src="<%= imgSrc %>"> \
    </span> \
    <div class="dsmd-panel <%= compactClass %>"> \
      <ul> \
        <li class="dsmd-li-title">Stats</li> \
        <li>Chassis: <span class="dsmd-label dsmd-label-info"><%  if( isStock === true ) { %>Stock <% } %><%= shortName %> \
        </span></li> \
        <li>Armor: <span class="dsmd-label dsmd-label-dmg"><%= usedArmor %> / <%= maxArmor %></span></li> \
        <li>Firepower: <span class="dsmd-label dsmd-label-dmg"><%= firepower %></span></li> \
        <li>Sustained DPS: <span class="dsmd-label dsmd-label-dps"><%= dpsSustained %> dps</span></li> \
        <li>Max DPS: <span class="dsmd-label dsmd-label-dps"><%= dpsMax %> dps</span></li> \
        <li>Cool. Eff.: <span class="dsmd-label dsmd-label-cooling"><%= coolingEfficiency %>%</span></li> \
        <li>Speed: <span class="dsmd-label dsmd-label-info"><%= topSpeed %> kph</span></li> \
        <li>&nbsp; <span class="dsmd-label dsmd-label-success"><%= topSpeedTweak %> kph</span></li> \
      </ul> \
    </div> \
    \
    <div class="dsmd-panel <%= compactClass %>"> \
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
    <div class="dsmd-panel <%= compactClass %>"> \
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
    <span class="dsmd-status <%= compactClass %> <% if ( !isValid ) { %>dsmd-invalid<% } %>"> Created: <%= createdDate %><% if ( !isValid ) { %> (Invalid)<% } %></span> \
  </div>' );