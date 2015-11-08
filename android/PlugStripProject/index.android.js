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
     }
  },
  componentWillMount: function() {
    var self = this;
    BackAndroid.addEventListener('hardwareBackPress', function() {
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
            results[o.string] = o;
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
  renderBLERow: function(row) {
        console.log("row", row);
    return (
        <BLEDevice device={row} />
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

var BLEDevice = React.createClass({
    connectDevice: function(device) {
      console.log("\n\nConnect: "+this.props.device.macaddr+"\n\n");
      BLE.connect(this.props.device.macaddr, function(res) {
          console.log("got a result?" + res);
      });
    },
    render: function() {
        return (
          <TouchableHighlight onPress={this.connectDevice}>
            <View style={styles.bleDevice}>
              <Text>{this.props.device.macaddr}</Text>
              <Text>{this.props.device.rssi}</Text>
              <Text>{this.props.device.name}</Text>
            </View>
          </TouchableHighlight>
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
  bleDevice: {
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
