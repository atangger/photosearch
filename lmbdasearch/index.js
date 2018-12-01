// dependencies
var async = require('async');
var AWS = require('aws-sdk');
var gm = require('gm')
            .subClass({ imageMagick: true }); // Enable ImageMagick integration.
var util = require('util');
var rekognition = new AWS.Rekognition();
var request = require('request');
// constants
var MAX_WIDTH  = 100;
var MAX_HEIGHT = 100;

function queryElasticsearch(queryString,callback){
    var url="https://search-testdomain-b7bncpjmvybaj2mt2e54cltxam.us-east-1.es.amazonaws.com/wtf/_search";
    var para = {
        url: url,
        method: "GET",
        json: true,
        headers: {
            "content-type": "application/json"
        },
        qs:{
            "q":queryString
        }
    };
    request(para,(error,response,body)=>{
        if (!error && response.statusCode == 200) {
            console.log(body);
            var response = {
            statusCode: 200,
            body: JSON.stringify(body)
        };
            callback(null,response);
        }
        else{
            callback(error,null);
        }
    });
}

 
exports.handler = function(event, context, callback) {
    queryElasticsearch(event.queryString,callback);
};
