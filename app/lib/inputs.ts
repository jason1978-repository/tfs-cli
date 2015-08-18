// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

/// <reference path="../../definitions/q/Q.d.ts" />

import arm = require('./arguments');
import cachem = require('./diskcache');
import cm = require('./common');
import os = require('os');
import Q = require('q');
import argm = require('./arguments');

var readline = require("readline")
  , read = require('read')
  , async = require('async')
  , argparser = require('minimist')
  , trace = require('./trace');

var args = argparser(process.argv.slice(2));

export function checkAll(args: string[], options: cm.IOptions, requiredArguments: argm.Argument[], optionalArguments: argm.Argument[]): Q.Promise<cm.IStringIndexer> {
    var settingsArg = argm.SETTINGS;
    var settingsPath = options[settingsArg.name] ? settingsArg.getValueFromString(options[settingsArg.name].toString()) : settingsArg.defaultValue;
    return cachem.parseSettingsFile(settingsPath, !options[settingsArg.name]).then((settings: cm.IStringIndexer) => {
        return check(args, options, settings, requiredArguments, optionalArguments).then((allArguments) => {
            if(options[argm.SAVE.name]) {
                cachem.saveOptions(allArguments, settingsPath);
            }
            return Q.resolve(allArguments); 
        });
    });
}

export function check(args: string[], options: cm.IOptions, settings: cm.IStringIndexer, requiredArguments: argm.Argument[], optionalArguments: argm.Argument[]): Q.Promise<cm.IStringIndexer> {
    trace.debug('inputs.check');
    var defer = Q.defer<cm.IStringDictionary>();
    var allArguments: cm.IStringIndexer = settings;
    for(var i = 0; i < requiredArguments.length; i++) {
        var arg: argm.Argument = requiredArguments[i];
        var name: string = arg.name;
        allArguments[name] = args[i] ? arg.getValueFromString(args[i].toString()) : (options[name] ? arg.getValueFromString(options[name].toString()) : (settings[name] ? arg.getValueFromString(settings[name].toString()) : arg.defaultValue));
        if(!allArguments[name]) {
            trace.debug('Required parameter ' + name + ' not supplied.');
            defer.reject(new Error('Required parameter ' + name + ' not supplied.' + os.EOL + 'Try adding a switch to the end of your command: --' + name + ' <' + arg.friendlyName + '>'));
        }
    }
    for(var i = 0; i < optionalArguments.length; i++) {
        var arg: argm.Argument = optionalArguments[i];
        var name: string = arg.name;
        allArguments[name] = options[name] ? arg.getValueFromString(options[name].toString()) : (settings[name] ? arg.getValueFromString(settings[name].toString()) : arg.defaultValue);
    }
    var settingsPath = 
    defer.resolve(allArguments);
    return defer.promise;
}

// Q wrapper
export function Qprompt(requiredInputs: argm.Argument[], optionalInputs: argm.Argument[]): Q.Promise<cm.IStringDictionary> {
    var defer = Q.defer<cm.IStringDictionary>();

    this.prompt(requiredInputs, optionalInputs, (err, result: cm.IStringDictionary) => {
        if (err) {
            defer.reject(err);
        }

        defer.resolve(result);
    }); 

    return defer.promise;
}

// done(err, result)
export function prompt(requiredInputs: argm.Argument[], optionalInputs: argm.Argument[], done: (err: Error, result: cm.IStringIndexer) => void): void {
    trace.debug('inputs.prompt');
    var result: cm.IStringIndexer = <cm.IStringIndexer>{};
    
    result['_'] = args['_'];
    
    var inputs = requiredInputs.concat(optionalInputs);

    // TODO: get rid of async and code just with Q

    async.forEachSeries(inputs, function (input: argm.Argument, inputDone) {
        if (args[input.name]) {
            result[input.name] = args[input.name];
            inputDone(null, null);
            return;
        }

        var msg = 'Enter ' + input.friendlyName;
        if (input.defaultValue) {
            msg += ' (enter sets ' + input.defaultValue + ') ';
        }
        msg += ' > ';

        read({ prompt: msg, silent: input.silent }, function(err, answer) {
            result[input.name] = answer ? input.getValueFromString(answer.toString()) : input.defaultValue;
            trace.debug('read: ' + result[input.name]);
            inputDone(null, null);
        });
    }, function(err) {
        
        if (err) {
            trace.debug('Input reading failed with message: ' + err.message);
            done(err, null);
            return;
        }

        // final validation
        requiredInputs.forEach(function(input) {

            if (!result[input.name]) {
                trace.debug(input.name + ' is required.');
                done(new Error(input.name + ' is required.'), null);
                return;
            }
        });

        done(null, result);
    });
}
