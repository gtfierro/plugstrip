/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

var Button = require('react-native-button');
var React = require('react-native');
var {
  AppRegistry,
  Image,
  StyleSheet,
  Text,
  View,
  ListView,
  ToastAndroid,
  TouchableWithoutFeedback,
} = React;

var PlugStripProject = React.createClass({
  getInitialState: function() {
    return {
        _screen: 'menu',
        dataSource: new ListView.DataSource({
            rowHasChanged: (row1, row2) => row1 !== row2,
        }),
        message: '',
     }
  },
  schedulePress: function() {
    ToastAndroid.show("Pressed schedule", ToastAndroid.SHORT);
  },
  scanPress: function() {
    ToastAndroid.show("Pressed scan", ToastAndroid.SHORT);
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

    switch (this.state._screen) {
    case 'query':
        page = queryPage;
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
