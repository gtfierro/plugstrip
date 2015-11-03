var Dashboard = React.createClass({
    mixins: [SubscribeQueryBase],
    getInitialState: function() {
        return {page: "dashboard", state: 0}
    },
    updateFromRepublish: function(obj) {
        var self = this;
        console.log(obj);
        _.map(obj, function(data) {
            self.setState({state: get_latest_reading(data.Readings)});
        });
    },
    turnon: function() {
        $.ajax({
            url: "/on"
        });
    },
    turnoff: function() {
        $.ajax({
            url: "/off"
        });
    },
    componentWillMount: function () {
        console.log("Starting subscription for", this.props.queryBase);
        this.socket = io.connect();
        this.socket.emit('new subscribe', this.props.queryBase);
        var self = this;
        this.socket.on(this.props.queryBase, function(data) {
            if (self.isMounted()) {
                self.updateFromRepublish(data);
            }
        });
    },
    render: function() {
        return (
            <div className="dashboard">
                <div className="buttons">
                    <h1>Ultimate Power</h1>
                    <div className="row">
                        <Button onClick={this.turnon} bsStyle="success">Turn Plugstrip On</Button>
                    </div>
                    <div className="row">
                        <Button onClick={this.turnoff} bsStyle="danger">Turn Plugstrip Off</Button>
                    </div>
                    <div className="row">
                        State: {this.state.state}
                    </div>
                </div>
            </div>
        );
    }
});

var SubscribeQueryBase = {
    componentDidMount: function() {
        console.log("Starting subscription for", this.props.queryBase);
        this.socket = io.connect();
        this.socket.emit('new subscribe', this.props.queryBase);
        var self = this;
        this.socket.on(this.props.queryBase, function(data) {
            if (self.isMounted()) {
                self.updateFromRepublish(data);
            }
        });
    },
};

React.render(
    <Dashboard queryBase="uuid = '693a057c-7b73-11e5-bfcd-0cc47a0f7eea'"/>,
    document.getElementById('content')
);
