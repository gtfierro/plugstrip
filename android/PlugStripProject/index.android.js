/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

var Button = require('react-native-button');
var React = require('react-native');
var BLE =  require('./bleScan');
var {
  AppRegistry,
  Image,
  StyleSheet,
  Text,
  View,
  ListView,
  ToastAndroid,
  BackAndroid,
  TouchableWithoutFeedback,
  TouchableHighlight,
} = React;


var PlugStripProject = React.createClass({
  getInitialState: function() {
    return {
        _screen: 'menu',
        dataSource: new ListView.DataSource({
            rowHasChanged: (row1, row2) => row1 !== row2,
        }),
        dataSourceBLE: new ListView.DataSource({
            rowHasChanged: (row1, row2) => row1 !== row2,
        }),
        message: '',
        macaddr: null,
     }
  },
  componentWillMount: function() {
    var self = this;
    BackAndroid.addEventListener('hardwareBackPress', function() {
        BLE.disconnect();
        if (self.state._screen != 'menu') {
            self.setState({_screen: 'menu'});
            return true;
        }
        return false;
    })
  },
  schedulePress: function() {
    ToastAndroid.show("Pressed schedule", ToastAndroid.SHORT);
  },
  scanPress: function() {
    ToastAndroid.show("Pressed scan", ToastAndroid.SHORT);
    var self =  this;
    BLE.scan(function(res) {
        console.log("results", res);
        ToastAndroid.show("returned from scan", ToastAndroid.SHORT);
        var results = {};
        for (var i=0;i<res.length;i++) {
            var o = res[i];
            results[o.macaddr] = o;
        }
        self.setState({
            dataSourceBLE: self.state.dataSourceBLE.cloneWithRows(results),
            _screen: 'scan',
        });
    });
  },
  runSmapQuery: function() {
    ToastAndroid.show("Starting Query", ToastAndroid.SHORT);
    console.log("test");
    var request = new XMLHttpRequest();
    request.onreadystatechange = (e) => {
        if (request.readyState !== 4) {
            return;
        }

        if (request.status == 200) {
            console.log(request.responseText);
            this.setState({
                dataSource: this.state.dataSource.cloneWithRows(JSON.parse(request.responseText)),
                _screen: 'query',
            });
        } else {
            console.warn('error');
            console.log(request);
        }
    };
    request.open('POST', 'http://shell.storm.pm:8079/api/query', true);
    request.setRequestHeader("Content-type", "application/text");
    request.setRequestHeader("Accept", "application/json");
    request.send("select distinct Metadata/SourceName;");
  },
  renderSmapRow: function(row) {
    return (
        <Text>{row}</Text>
    );
  },
  connectDevice: function(device) {
    console.log("\n\nConnect: "+device.macaddr+"\n\n");
    this.setState({_screen: 'plugstrip',
                   macaddr: device.macaddr});
  },
  renderBLERow: function(row) {
    console.log("row", row);
    return (
        <BLEDeviceRow device={row} connectDevice={this.connectDevice.bind(null, row)}/>
    );
  },
  renderBLEHeader: function() {
    return (
        <View style={styles.bleHeader}>
          <Text style={styles.bleHeaderText}>MAC</Text>
          <Text style={styles.bleHeaderText}>RSSI</Text>
          <Text style={styles.bleHeaderText}>Name</Text>
        </View>
    );
  },
  render: function() {
    var page = (<View />);

    var menuPage = (
        <View style={styles.menuContainer}>
            <MenuItem text="Scan for Plug Strips" label="Scan" onPress={this.scanPress} />
            <MenuItem text="Schedule Plug Strip" label="Schedule" onPress={this.schedulePress} />
            <MenuItem text="Sample sMAP query" label="Query" onPress={this.runSmapQuery} />
        </View>
    );

    var queryPage = (
        <ListView
            dataSource={this.state.dataSource}
            renderRow={this.renderSmapRow}
            style={styles.listView}
        />
    );

    var scanPage = (
        <ListView
            dataSource={this.state.dataSourceBLE}
            renderRow={this.renderBLERow}
            renderSectionHeader={this.renderBLEHeader}
            style={styles.listView}
        />
    );

    switch (this.state._screen) {
    case 'query':
        page = queryPage;
        break;
    case 'scan':
        console.log("scan page!");
        page = scanPage;
        break;
    case 'plugstrip':
        page = <BLEDevice macaddr={this.state.macaddr}/>
        break;
    case 'menu':
    default:
        page = menuPage;
        break;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          PlugStrip Android App
        </Text>
        <Text>
            {this.state.message}
        </Text>
        <View style={{flex: 1, justifyContent: 'center'}}>
            {page}
        </View>
      </View>
    );
  }
});

// props:
//  text: descriptive text
//  label: button label
//  onPress: onPress for button
var MenuItem = React.createClass({
    render: function() {
        return (
            <View style={styles.menuItem}>
                <Text style={{textAlign: 'center', paddingLeft: 50}}>{this.props.text}</Text>
                <View style={styles.button}>
                    <Button onPress={this.props.onPress}>{this.props.label}</Button>
                </View>
            </View>
        )
    }
});

var BLEDeviceRow = React.createClass({
    render: function() {
        return (
          <TouchableHighlight onPress={this.props.connectDevice}>
            <View style={styles.bleDeviceRow}>
              <Text>{this.props.device.macaddr}</Text>
              <Text>{this.props.device.rssi}</Text>
              <Text>{this.props.device.name}</Text>
            </View>
          </TouchableHighlight>
        )
    }
});

var BLEDevice = React.createClass({
    getInitialState: function() {
        return {
            plugs: {}
        }
    },
    componentWillMount: function() {
        var self = this;
        BLE.connect(self.props.macaddr, function(res) {
            console.log(res.plug1.uuid)
            console.log(res.plug1.state)
            console.log("plugs", res);
            self.setState({plugs: res});
        });
    },
    setBLEState: function(state, plugnum) {
        var uuid = "0000b00d-0000-1000-8000-00805f9b34fb";
        BLE.setState(state, uuid);
    },
    render: function() {
        var rows = [];
        for (var key in this.state.plugs) {
            console.log("key", key);
            rows.push(<BLEPlug name={key} plug={this.state.plugs[key].uuid} plugstate={this.state.plugs[key].state} />);
        }
        console.log("rows", rows);
        return (
            <View style={styles.bledevice}>
                {rows}
            </View>
        );
    }
});

var BLEPlug = React.createClass({
    getInitialState: function() {
        return {plugstate: this.props.plugstate}
    },
    setBLEState: function(state, plugnum) {
        BLE.setState(state, plugnum);
        this.setState({plugstate: state});
    },
    render: function() {
        var ison = this.state.plugstate == 1;
        return (
            <View style={styles.bleButtonContainer}>
                <View style={{padding: 20, width: 200}}>
                    <Text style={{fontSize: 20, fontWeight:"bold", textDecorationLine:"underline"}}>Plug {this.props.name}:</Text>
                </View>
                <TouchableHighlight onPress={this.setBLEState.bind(null, 0, this.props.plug)}>
                    <View style={{padding: 20}}>
                        <Text style={{fontSize: 20, color: ison ? 'black': 'red'}}>Off</Text>
                    </View>
                </TouchableHighlight>
                <TouchableHighlight onPress={this.setBLEState.bind(null, 1, this.props.plug)}>
                    <View style={{padding: 20}}>
                        <Text style={{fontSize: 20, color: ison ? 'red': 'black'}}>On</Text>
                    </View>
                </TouchableHighlight>
            </View>
        );
    }
});

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  menuContainer: {
  },
  bleButtonContainer: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 3,
    borderColor: '#111',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginLeft: 20,
    marginRight: 20,
  },
  bledevice: {
  },
  menuItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'solid',
    borderColor: '#000',
    paddingTop: 10,
    paddingBottom: 10,
  },
  bleHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginLeft: 20,
    marginRight: 20,
    paddingBottom: 20,
  },
  bleHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
  bleDeviceRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 4,
    borderWidth: 0.5,    
    borderColor: '#d6d7da',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
    marginTop: 10,
  },
  button: {
    flex: 1,
    alignItems: 'center',
  },
  listView: {
    paddingTop: 20,
    backgroundColor: '#F5FCFF',
  },
});

AppRegistry.registerComponent('PlugStripProject', () => PlugStripProject);
