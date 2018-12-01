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

// get reference to S3 client 
var s3 = new AWS.S3();

function rekognizeLabels(bucket, key) {
  let params = {
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: key
      }
    },
    MaxLabels: 3,
    MinConfidence: 80
  };

  return rekognition.detectLabels(params).promise()
};

function toElasticsearch(tagObj,callback){
    request('https://search-testdomain-b7bncpjmvybaj2mt2e54cltxam.us-east-1.es.amazonaws.com/wtf/_search', 
    function (error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log("HIT total = " + JSON.parse(body).hits.total);
    var url="https://search-testdomain-b7bncpjmvybaj2mt2e54cltxam.us-east-1.es.amazonaws.com/wtf/_doc/" +JSON.parse(body).hits.total+1;
    var requestDat = new Object();
    requestDat.tags = new Array();
    for(var i = 0; i < tagObj.length; i ++){
        requestDat.tags.push(tagObj[i].Name);
    }
    // requestDat["director"] = "TWJ2";
    // requestDat["genre"] = ["comedy","trash","funny"];
    // requestDat["actor"] = "Weijie Tang";
    console.log("saving obj to elastic search:")
    console.log(requestDat)
    var para = {
        url: url,
        method: "PUT",
        json: true,
        headers: {
            "content-type": "application/json",
        },
        body: requestDat
    };
    request(para,(error,response,body)=>{
        console.log("in the request callback");
        if (!error) {
            console.log(body) 
        }
        else{
            console.log("error occur")
            console.log(error);
            callback(error,null);
        }
    });
  }
});
}

 
exports.handler = function(event, context, callback) {
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    var srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    var srcKey    =
    decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));  
    var dstBucket = srcBucket + "resized";
    var dstKey    = "resized-" + srcKey;


    rekognizeLabels(srcBucket, srcKey)
        .then(function(data) {
          console.log(data["Labels"]);
          toElasticsearch(data["Labels"],callback);
        })
        .catch(function(err) {
            callback(err, null);
        });
    // Sanity check: validate that source and destination are different buckets.
    if (srcBucket == dstBucket) {
        callback("Source and destination buckets are the same.");
        return;
    }

    // // Infer the image type.
    // var typeMatch = srcKey.match(/\.([^.]*)$/);
    // if (!typeMatch) {
    //     callback("Could not determine the image type.");
    //     return;
    // }
    // var imageType = typeMatch[1];
    // if (imageType != "jpg" && imageType != "png") {
    //     callback('Unsupported image type: ${imageType}');
    //     return;
    // }

    // // Download the image from S3, transform, and upload to a different S3 bucket.
    // async.waterfall([
    //     function download(next) {
    //         // Download the image from S3 into a buffer.
    //         s3.getObject({
    //                 Bucket: srcBucket,
    //                 Key: srcKey
    //             },
    //             next);
    //         },
    //     function transform(response, next) {
    //         gm(response.Body).size(function(err, size) {
    //             // Infer the scaling factor to avoid stretching the image unnaturally.
    //             var scalingFactor = Math.min(
    //                 MAX_WIDTH / size.width,
    //                 MAX_HEIGHT / size.height
    //             );
    //             var width  = scalingFactor * size.width;
    //             var height = scalingFactor * size.height;

    //             // Transform the image buffer in memory.
    //             this.resize(width, height)
    //                 .toBuffer(imageType, function(err, buffer) {
    //                     if (err) {
    //                         next(err);
    //                     } else {
    //                         next(null, response.ContentType, buffer);
    //                     }
    //                 });
    //         });
    //     },
    //     function upload(contentType, data, next) {
    //         // Stream the transformed image to a different S3 bucket.
    //         s3.putObject({
    //                 Bucket: dstBucket,
    //                 Key: dstKey,
    //                 Body: data,
    //                 ContentType: contentType
    //             },
    //             next);
    //         }
    //     ], function (err) {
    //         if (err) {
    //             console.error(
    //                 'Unable to resize ' + srcBucket + '/' + srcKey +
    //                 ' and upload to ' + dstBucket + '/' + dstKey +
    //                 ' due to an error: ' + err
    //             );
    //         } else {
    //             console.log(
    //                 'Successfully resized ' + srcBucket + '/' + srcKey +
    //                 ' and uploaded to ' + dstBucket + '/' + dstKey
    //             );
    //         }

    //         callback(null, "message");
    //     }
    // );
};
