/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

var Button = require('react-native-button');
var React = require('react-native');
var BLE =  require('./bleScan');
var Form = require('react-native-form');
var Dropdown = require('react-native-dropdown-android');
var util = require('./util');

var {
  AppRegistry,
  Image,
  StyleSheet,
  Text,
  SwitchAndroid,
  TextInput,
  View,
  ListView,
  ToastAndroid,
  BackAndroid,
  TouchableWithoutFeedback,
  TouchableHighlight,
} = React;

var connected_macaddr = null;

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
        if (self.state._screen == 'configure') {
            self.setState({macaddr: connected_macaddr, _screen: 'plugstrip'});
            return true;
        } else if (self.state._screen != 'menu') {
            BLE.disconnect();
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
    connected_macaddr = device.macaddr;
  },
  configureDevice: function(macBLE, mac154) {
    console.log("\n\configure: "+macBLE+"\n\n");
    this.setState({_screen: 'configure',
                   macaddr: macBLE,
                   mac154: mac154});
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

    var configurePage = (
        <View>
            <Text>configure</Text>
        </View>
    );

    switch (this.state._screen) {
    case 'query':
        page = queryPage;
        break;
    case 'scan':
        page = scanPage;
        break;
    case 'plugstrip':
        page = <BLEDevice macaddr={this.state.macaddr} configure={this.configureDevice.bind(null, this.state.macaddr)} />
        break;
    case 'configure':
        page = <PlugConfigure macaddr={connected_macaddr} mac154={this.state.mac154} />
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
              <Text style={styles.bleDeviceRowText} >{this.props.device.macaddr}</Text>
              <Text style={styles.bleDeviceRowText} >{this.props.device.rssi}</Text>
              <Text style={styles.bleDeviceRowText} >{this.props.device.name}</Text>
            </View>
          </TouchableHighlight>
        )
    }
});

var BLEDevice = React.createClass({
    getInitialState: function() {
        return {
            plugs: {},
            mac154: "",
        }
    },
    componentWillMount: function() {
        var self = this;
        BLE.connect(self.props.macaddr, function(res) {
            console.log("plugs", res);
            var uuid = res['nodemac'];
            delete res['nodemac'];
            self.setState({plugs: res});
            BLE.getNodeMAC(self.props.macaddr, function(mac) {
                self.setState({mac154: mac.nodemac});
            });
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
            <View>
                <View style={styles.bledevice}>
                    {rows}
                </View>
                <View style={{marginBottom: 30, padding: 20}}>
                    <TouchableHighlight onPress={this.props.configure.bind(null, this.state.mac154)}>
                        <Text style={{fontSize: 20, padding:20, textAlign: 'center'}}>Configure</Text>
                    </TouchableHighlight>
                </View>
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

var PlugConfigure = React.createClass({
    getInitialState: function() {
        return {'buildings': [],
                'floors': ['waiting...'],
                'rooms': ['waiting...'],
                'owners': ['waiting...'],
               }
    },
    getBuildings: function() {
        var self = this;
        util.QuerySmap("select distinct Metadata/Location/Building",
            function(data) {
                console.log("BUILDINGS", data);
                if (data.length == 0) {
                    data = ['None Found'];
                } else {
                    data.unshift('--choose--');
                }
                self.setState({'buildings': data});
            },
            function(err) {
                self.setState({'buildings': ['ERROR']});
                console.err(data);
            }
        )
    },
    getFloors: function() {
        var self = this;
        util.QuerySmap("select distinct Metadata/Location/Floor where Metadata/Location/Buildings='"+this.state.building+"';",
            function(data) {
                console.log("FLOORS", data);
                if (data.length == 0) {
                    data = ['None Found'];
                }
                self.setState({'floors': data});
            },
            function(err) {
                self.setState({'floors': ['ERROR']});
                console.err(data);
            }
        )
    },
    getRooms: function() {
        var self = this;
        util.QuerySmap("select distinct Metadata/Location/Room where Metadata/Location/Floor='"+this.state.floor+"' and Metadata/Location/Buildings='"+this.state.building+"';",
            function(data) {
                console.log("ROOMS", data);
                if (data.length == 0) {
                    data = ['None Found'];
                }
                self.setState({'rooms': data});
            },
            function(err) {
                self.setState({'rooms': ['ERROR']});
                console.err(data);
            }
        )
    },
    getOwners: function() {
        var self = this;
        util.QuerySmap("select distinct Metadata/Owner where Metadata/Location/Building='"+this.state.building+"';",
            function(data) {
                console.log("Owners", data);
                if (data.length == 0) {
                    data = ['None Found'];
                }
                self.setState({'owners': data});
            },
            function(err) {
                self.setState({'owners': ['ERROR']});
                console.err(data);
            }
        )
    },
    getDevices: function() {
        var self = this;
        util.QuerySmap("select distinct Metadata/Device/Type;",
            function(data) {
                console.log("Devices", data);
                if (data.length == 0) {
                    data = ['None Found'];
                }
                self.setState({'devices': data});
            },
            function(err) {
                self.setState({'devices': ['ERROR']});
                console.err(data);
            }
        )
    },
    doConfigure: function() {
        // pack up the stuff into a real sMAP object
        // TODO: how do we discover the UUID?
    },
    componentWillMount: function() {
        this.getBuildings();
        this.getDevices();
    },
    render: function() {
        return (
            <View>
                <Text style={{ fontSize: 24, textAlign: 'center' }}>
                Configuring PlugStrip
                </Text>
                <Text style={{ fontSize: 22, textAlign: 'center' }}>
                {this.props.mac154}
                </Text>
                <View style={styles.formContainer}>
                    <View style={styles.formRow}>
                        <Text style={{ fontSize: 20, width: 90 }}> Building: </Text>
                        <Dropdown
                            style={{ height: 20, width: 120 }}
                            values={this.state.buildings}
                            selected={0}
                            onChange={(data) => {
                                this.setState({'building': data.value});
                                this.getFloors();
                            }}
                            name="building"
                        />
                        <TextInput style={{ width: 120 }}
                            onChangeText={(text) => {
                                this.setState({'building': text})
                            }}
                            placeholder="New Building"
                        />
                    </View>
                    <View style={styles.formRow}>
                        <Text style={{ fontSize: 20, width: 90 }}> Floor </Text>
                        <Dropdown
                            style={{ height: 20, width: 120 }}
                            values={this.state.floors}
                            selected={0}
                            onChange={(data) => {
                                if (data.value == 'None Found') {return;}
                                this.setState({'floor': data.value});
                                this.getRooms();
                            }}
                            name="floor"
                        />
                        <TextInput style={{ width: 120 }}
                            onChangeText={(text) => {
                                this.setState({'floor': text})
                                this.getRooms();
                            }}
                            placeholder="New Floor"
                        />
                    </View>
                    <View style={styles.formRow}>
                        <Text style={{ fontSize: 20, width: 90 }}> Room </Text>
                        <Dropdown
                            style={{ height: 20, width: 120 }}
                            values={this.state.rooms}
                            selected={0}
                            onChange={(data) => {
                                if (data.value == 'None Found') {return;}
                                this.setState({'room': data.value});
                                this.getOwners();
                            }}
                            name="room"
                        />
                        <TextInput style={{ width: 120 }}
                            onChangeText={(text) => {
                                this.setState({'room': text})
                                this.getOwners();
                            }}
                            placeholder="New Room"
                        />
                    </View>
                    <View style={styles.formRow}>
                        <Text style={{ fontSize: 20, width: 90 }}> Owner </Text>
                        <Dropdown
                            style={{ height: 20, width: 120 }}
                            values={this.state.owners}
                            selected={0}
                            onChange={(data) => {
                                if (data.value == 'None Found') {return;}
                                this.setState({'owner': data.value});
                            }}
                            name="owner"
                        />
                        <TextInput style={{ width: 120 }}
                            onChangeText={(text) => {
                                this.setState({'owner': text})
                            }}
                            placeholder="New Owner"
                        />
                    </View>
                    <View style={styles.formRow}>
                        <Text style={{ fontSize: 20, width: 90 }}> Device </Text>
                        <Dropdown
                            style={{ height: 20, width: 120 }}
                            values={this.state.devices}
                            selected={0}
                            onChange={(data) => {
                                if (data.value == 'None Found') {return;}
                                this.setState({'device': data.value});
                            }}
                            name="device"
                        />
                        <TextInput style={{ width: 120 }}
                            onChangeText={(text) => {
                                this.setState({'device': text})
                            }}
                            placeholder="New Device"
                        />
                    </View>
                </View>
                <View style={{ marginBottom: 20, margin: 20, height: 60 }} >
                    <TouchableHighlight>
                        <Text style={{fontSize: 24, textAlign: 'center'}}>Configure!</Text>
                    </TouchableHighlight>
                </View>

            </View>
        )
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
    fontSize: 24,
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
    height: 100,
    borderColor: '#d6d7da',
  },
  bleDeviceRowText: {
    fontSize: 16,
  },
  welcome: {
    fontSize: 36,
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
  formContainer: {
    flex: 1,
  },
  formRow: {
    margin: 5,
    height: 80,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

AppRegistry.registerComponent('PlugStripProject', () => PlugStripProject);
