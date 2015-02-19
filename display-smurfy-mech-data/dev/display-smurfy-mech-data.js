// OPEN ISSUES: HANDLING SMALLER CONTAINER SIZES.
// - Clean up state transitions - lock elements in place until resize done? No auto flow?
// - Get height of title, size of content area to figure out panel size.
//   - This works well enough, for now.
// - position status text better or hide it? Reduce size of panel-container based on status size?

var SmurfyApp = {
  urlBase: 'https://smurfyservlet.herokuapp.com/',
  //urlBase: 'http://mwo.smurfy-net.de/',
  cachedChassis : {},
  cachedLoadouts : {},
  isCompact : false,
  AjaxSettings : function( url ) {
    this.url            = url;
    this.timeout        = 7500;
    this.type           = 'GET';
    this.async          = true;
    this.contentType    = "application/json";
    this.dataType       = 'jsonp';
    this.jsonpCallback  = 'callback';
  },
  DataID : function( chassisID, loadoutID )
  {
    this.chassis = chassisID;
    this.loadout = loadoutID;
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

SmurfyApp.DataID.prototype.chassisURL = function(){
  return SmurfyApp.urlBase + "api/data/mechs/" + this.chassis + ".json";
};

SmurfyApp.DataID.prototype.loadoutURL = function(){
  return SmurfyApp.urlBase + "api/data/mechs/" + this.chassis + "/loadouts/" + this.loadout + ".json";
};

SmurfyApp.roundValue = function( value ) {
  return Math.round((value + 0.00001) * 100) / 100;
};

SmurfyApp.parseCreateDate = function ( createDate ) {
  // 2014-11-29T03:07:35+000
  var s = (createDate.substr( 0, createDate.indexOf('T') )).split('-');
  return SmurfyApp.Months[ s[1] - 1 ] + " " + s[2] + ", " + s[0];
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

SmurfyApp.handleResizeComplete = function() {
  var isFirst = true;
  jQuery('.dsmd-container').each( function() {
    if( isFirst ) {
      // Just check one container's width, they'll all be this size.
      isFirst = false;
      if( !SmurfyApp.updateMinimizedState( jQuery(this).width() ) )
      {
        // The minimized state didn't change, so leave.
        // Returning false breaks the each loop.
        return false;
      }
    }
    SmurfyApp.resizePanels( jQuery(this) );
  });

};

SmurfyApp.updateMinimizedState = function( containerWidth ){
  // Return true if the state changed
  if( containerWidth < 540 && !SmurfyApp.isCompact )
  {
    // panels go parallel
    SmurfyApp.isCompact = true;
    return true;
  }
  else if( containerWidth >= 540 && SmurfyApp.isCompact )
  {
    SmurfyApp.isCompact = false;
    return true;
  }
  return false;
};

SmurfyApp.resizePanels = function( container ) {
  if( SmurfyApp.isCompact ) {
    container.children('.dsmd-panel-container')
      .addClass('dsmd-compact')
      .children()
        .addClass('dsmd-compact');
  } else {
    container.children('.dsmd-panel-container')
      .removeClass('dsmd-compact')
      .children()
        .removeClass('dsmd-compact');
  }
};

SmurfyApp.showExpanderError = function( expander ) {
  var expanderPos = expander.position();
  var expanderOffset = expander.offset();
  var errmsg = jQuery( '.dsmd-expander-errormsg' );
  errmsg
    .css( { top: expanderOffset.top + ( expander.height() * 2 ), left: expanderOffset.left + expander.width() - errmsg.width() } )
    .text( expander.data( 'error-msg' ) )
    .addClass( 'dsmd-visible' );
};

SmurfyApp.hideExpanderError = function() {
  jQuery( '.dsmd-expander-errormsg' ).removeClass( 'dsmd-visible' );
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
    if( !SmurfyApp.cachedChassis.hasOwnProperty( dataID.chassis ) )
    {
      jQuery.ajax( new SmurfyApp.AjaxSettings( dataID.chassisURL() ) )
        .done( function( response, textStatus, jqXHR ) {
          SmurfyApp.cachedChassis[dataID.chassis] = response;
          container.trigger( 'chassisDataReady' );
        } )
        .fail( function () {
          SmurfyApp.handleError( expander, 'Failed to retrieve chassis data.' );
        });
    } else {
      container.trigger( 'chassisDataReady' );
    }

    if( !SmurfyApp.cachedLoadouts.hasOwnProperty( dataID.key() ) ){
      // Wait for the chassis data to load.
      container.on( 'chassisDataReady', function() {
        container.off( 'chassisDataReady');
        jQuery.ajax( new SmurfyApp.AjaxSettings( dataID.loadoutURL() ) )
          .done( function( response ) {
            SmurfyApp.cachedLoadouts[dataID.key()] = response;
            container.trigger('dataReady');
          } )
          .fail( function () {
            SmurfyApp.handleError( expander, 'Failed to retrieve loadout data.' );
          } );
      } );
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
    if( !armament.hasOwnProperty('weapon_type') ) {
      armament.weapon_type = SmurfyApp.mechItemDetails[armament.id].weapon_type || 'unknown';
    }
  } );

  // Iterate over the ammuntion and add num shots
  _.each( loadoutData.stats.ammunition, function( ammo ){
    if( !ammo.hasOwnProperty('num_shots') ) {
      ammo.num_shots = (SmurfyApp.mechItemDetails[ammo.id].num_shots || 0) * ammo.count;
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
    compactClass      : SmurfyApp.isCompact ? 'dsmd-compact' : '',
    imgSrc            : 'http://mwo.smurfy-net.de/assetic/img/tt_image/' + chassisData.name + '.png',
    shortName         : chassisData.translated_short_name,
    isStock           : dataID.loadout.toLowerCase() === 'stock',
    usedArmor         : loadoutData.stats.used_armor,
    maxArmor          : chassisData.details.max_armor,
    firepower         : loadoutData.stats.firepower,
    dpsSustained      : SmurfyApp.roundValue(loadoutData.stats.dps_sustained),
    dpsMax            : SmurfyApp.roundValue(loadoutData.stats.dps_max),
    coolingEfficiency : loadoutData.stats.cooling_efficiency,
    topSpeed          : loadoutData.stats.top_speed ? SmurfyApp.roundValue( loadoutData.stats.top_speed ) : 0,
    topSpeedTweak     : loadoutData.stats.top_speed_tweak ? SmurfyApp.roundValue( loadoutData.stats.top_speed_tweak ): 0,
    armaments         : loadoutData.stats.armaments,
    engineType        : loadoutData.stats.engine_type,
    engineRating      : loadoutData.stats.engine_rating,
    jumpJets          : (loadoutData.stats.used_jump_jets || 0) + (loadoutData.stats.granted_jump_jets || 0 ),
    jumpJetsMax       : chassisData.details.jump_jets,
    heatSinks         : loadoutData.stats.heatsinks || 0,
    hasElectronics    : hasElectronics,
    ecmInstalled      : ecmInstalled,
    activeProbe       : activeProbe,
    targetingComputer : targetingComputer,
    commandConsole    : commandConsole,
    ammunition        : loadoutData.stats.ammunition,
    upgrades          : upgrades,
    isValid           : loadoutData.valid,
    createdDate       : parsedDate
  };

  container
    .append( SmurfyApp.mechDataView( displayData ) )
    .attr( 'data-built-view', true )
    .delay( 0.2 )
    .trigger( 'viewBuilt' );
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

  // Grab a single container object. If none exist, then
  // we'll just leave, as there's nothing to do here.
  var singleContainer = jQuery('.dsmd-container').first();
  if( singleContainer.length === 0 ){
    return;
  }

  // Set the initial minimized state.
  SmurfyApp.updateMinimizedState( singleContainer.width() );

  // create the error msg div
  jQuery('body').append( SmurfyApp.errorTemplate() );

  // Setup the container event handlers
  jQuery( '.dsmd-container' )
    .on( 'toggleState', function() {
      var container = jQuery( this );
      container.toggleClass( 'dsmd-container-expanded' );
      if( !SmurfyApp.Modernizr.csstransitions )
      {
        container.trigger( 'transitionend' );
      }
    } )
    .on( 'transitionend', function() {
      var expander = jQuery(this).find( '.dsmd-expander' );
      if( SmurfyApp.hasExpanderStateClasses( expander, 'loading' ) ||
          SmurfyApp.hasExpanderStateClasses( expander, 'open' ) )
      {
        SmurfyApp.setExpanderState( expander, 'close');
      } else {
        SmurfyApp.setExpanderState( expander, 'open');
      }
      //SmurfyApp.resizePanels( jQuery( this ) );
      expander.on( 'click', SmurfyApp.expanderClickHandler );
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

SmurfyApp.errorTemplate = _.template('<div class="dsmd-expander-errormsg dsmd-hidden"></div>');

SmurfyApp.mechDataView = _.template(' \
  <div class="dsmd-panel-container <%= compactClass %>"> \
    <span class="dsmd-mech-image <%= compactClass %>"> \
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