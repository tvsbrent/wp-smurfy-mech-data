var SmurfyApp = {
  urlBase: 'https://smurfyservlet.herokuapp.com/',
  //urlBase: 'http://mwo.smurfy-net.de/',
  cachedChassis : {},
  cachedLoadouts : {},
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
  ExpanderState : {
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
  expander.attr( "class", SmurfyApp.ExpanderBaseClass + " " + SmurfyApp.ExpanderState[state] );
};

SmurfyApp.hasExpanderState = function( expander, state ) {
  return expander.hasClass( SmurfyApp.ExpanderState[state] );
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
  var expanderPos = expander.position();
  var errmsg = jQuery( '.dsmd-expander-errormsg' );
  errmsg
    .css( { top: expanderPos.top + ( expander.height() * 2 ), left: expanderPos.left + expander.width() - errmsg.width() } )
    .text( expander.data( 'error-msg' ) )
    .addClass( 'dsmd-visible' );
};

SmurfyApp.hideExpanderError = function() {
  jQuery( '.dsmd-expander-errormsg' ).removeClass( 'dsmd-visible' );
};

SmurfyApp.buildMechDataView = function( container, expander ) {
  try {
    var dataID = new SmurfyApp.DataID();

    container.on( 'dataReady', function() {
      container.off( 'dataReady' );
      try {
        SmurfyApp.mechDataReady( container, dataID );
      } catch ( errorMsg ) {
        SmurfyApp.handleError( expander, errorMsg );
      }
    } );

    if( !SmurfyApp.getChassisAndLoadoutID( expander, dataID ) )
    {
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

    if( !SmurfyApp.cachedLoadouts.hasOwnProperty( dataID.key() ) )
    {
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

SmurfyApp.mechDataReady = function( container, dataID ) {
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
      SmurfyApp.buildMechDataView( container, expander );
    }
  }
};

jQuery( document ).ready( function() {

  // This is crappy code to handle smaller windows.
  // Make it better... flippers, to flip between panels?
  // Scrollbars?
  /*
  var isParallel = false;
  jQuery(window).resize( function() {
    // Just get one container's width, they'll all be this size.
    var updateCSS = false;
    var containerWidth = jQuery('.dsmd-container').first().width();
    if( containerWidth < 540 && !isParallel )
    {
      // panels go parallel
      jQuery('.dsmd-panel').css( { display: 'block' } );
      isParallel = true;
      updateCSS = true;
    }
    else if( isParallel )
    {
      jQuery('.dsmd-panel').css( { display: 'inline-block' } );
      isParallel = false;
      updateCSS = true;
    }

    if( updateCSS ) {
      if( isParallel ) {
        jQuery('.dsmd-panel-container').css( { 'overflow-y' : 'scroll' } );
      } else {
        jQuery('.dsmd-panel-container').css( { 'overflow-y' : 'none' } );
      }
      // Resize all the containers based on the panel container size.
       // var titleHeight = jQuery('dsmd-title' ).first().height();jQuery('.dsmd-panel-container' ).each( function() {
        var panelHeight = jQuery(this).height();
        jQuery(this).closest('.dsmd-container' ).css({ height: titleHeight + panelHeight });
      });
    }
  });
  */

  // create the error msg div
  jQuery('body').append( SmurfyApp.errorTemplate() );

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
      if( SmurfyApp.hasExpanderState( expander, 'loading' ) ||
          SmurfyApp.hasExpanderState( expander, 'open' ) )
      {
        SmurfyApp.setExpanderState( expander, 'close');
      } else {
        SmurfyApp.setExpanderState( expander, 'open');
      }
      expander.on( 'click', SmurfyApp.expanderClickHandler );
    } );

  jQuery( '.dsmd-expander' ).on( 'click', SmurfyApp.expanderClickHandler );
} );

//////////////////////////////////////////////////////////////
// TEMPLATES

SmurfyApp.errorTemplate = _.template('<div class="dsmd-expander-errormsg dsmd-hidden"></div>');

SmurfyApp.mechDataView = _.template(' \
  <div class="dsmd-panel-container"> \
    <span class="dsmd-mech-image"> \
      <img src="<%= imgSrc %>"> \
    </span> \
    <div class="dsmd-panel"> \
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
    <div class="dsmd-panel"> \
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
    <div class="dsmd-panel"> \
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
    <span class="dsmd-status <% if ( !isValid ) { %>dsmd-status-invalid<% } %>"> Created: <%= createdDate %><% if ( !isValid ) { %> (Invalid)<% } %></span> \
  </div>' );