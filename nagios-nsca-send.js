module.exports = function(RED) {
    "use strict";
    var exec = require('child_process').exec;  // this will execute the bash command for send_nsca

    function NagiosNSCASend(config) {
        var node = this;
        RED.nodes.createNode(node, config);

        /*  get the config data */ 
        node.ncsahost = config.ncsahost;
        node.nscaport = config.nscaport ? parseInt(config.nscaport, 10) : 5667; // make sure only numbers are transmitted
        node.hostname = config.hostname;
        node.servicename = config.servicename;
        node.send_nsca = config.send_nsca;
        node.send_nsca_cfg = config.send_nsca_cfg;
        node.statusCode = config.statusCode || 3;
        node.statusCodeType = config.statusCodeType || "num";
        node.messageTxt = config.messageTxt || "UNKNOWN";
        node.messageTxtType = config.messageTxtType || "str";

        this.on('input', function(msg, send, done) {

        // Get the value by the type of source and return it.
        function getValue(type, value) {
            console.log("type = " + type + ", value = " + value);
            switch (type) {
                case 'str' :
                case 'num' :
                    return value;
                    break;
                case 'msg' :
                    return RED.util.getMessageProperty(msg,value);
                    break;
                case 'flow' :
                    return node.context().flow.get(value);
                    break;
                case 'global' :
                    return node.context().global.get(value);
                    break;
                case 'jsonata' :
                    return value.evaluate({msg:msg});
                    break;
                default :
                    return null;
                    break;
            }
        }

            // compose the command used for transfer to nagios nsca service
            var command = node.send_nsca
                          + " -H " + node.ncsahost
                          + " -p " + node.nscaport
                          + " -c " + node.send_nsca_cfg;
            console.log( "statusCode = " + getValue(node.statusCodeType, node.statusCode) );
            var statusCode = parseInt(getValue(node.statusCodeType, node.statusCode));
                statusCode = isNaN(statusCode) ? 3 : statusCode;
            var messageTxt = getValue(node.messageTxtType, node.messageTxt) || "UNKNOWN";

            // compose the nsca-message for using with send_nsca
            // doublequotes must be escaped
            var nsca_msg = node.hostname.replace(/"/g, '\\"') + "\t"
                           + node.servicename.replace(/"/g, '\\"') + "\t"
                           + statusCode + "\t"
                           + messageTxt;

            // compose the whole command to be executed.
            var wholecommand = "/bin/echo -e \"" + nsca_msg + "\" | " + command;

            console.log( "wholecommand = " + wholecommand );

            // execute the command
            exec( wholecommand, function (error, stdout, stderr) {
                // process the returned values
                if (error !== null) {
                    // errors will be printed
                    console.log("exec error: " + error);
                }
                if (stdout !== "" && stdout !== null) {
                    // if the return on stdout is not the expected default text, print it as a warning
                    if (stdout !== "1 data packet(s) sent to host successfully.\n") {
                        node.warn(stdout);
                    }
                }
                // if there is something on the stderr then print it as an error
                if (stderr !== "" && stderr !== null) {
                    node.error("stderr = " + stderr);
                }
            });
        });
}

    // register the action for this node
    RED.nodes.registerType("nagios-nsca-send", NagiosNSCASend);
};
