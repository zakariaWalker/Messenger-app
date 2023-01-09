// const { config } = require("dotenv");
const dotenv =require("dotenv").config();
const request = require("request");
const homepageService = require("../services/homepageService");
// const chatbotService = require("../services/chatbotService");
// require("dotenv").config();
// import homepageService from "../services/homepageService";
// import chatbotService from "../services/chatbotService";
// import templateMessage from "../services/templateMessage";

const MY_VERIFY_TOKEN = process.env.MY_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
console.log(MY_VERIFY_TOKEN)

let getHomePage = (req, res) => {
    
    return res.render("homepage.ejs")
        
    
};

let getWebhook = (req, res) => {
    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = MY_VERIFY_TOKEN;
    
    
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
        console.log(mode);
        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token ===VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
    
};

let postWebhook = (req, res) => {
    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {
            //check the incoming message from primary app or not; if secondary app, exit
            if (entry.standby) {
                //if user's message is "back" or "exit", return the conversation to the bot
                let webhook_standby = entry.standby[0];
                if (webhook_standby && webhook_standby.message) {
                    if (webhook_standby.message.text === "back" || webhook_standby.message.text === "exit") {
                        // call function to return the conversation to the primary app
                        // chatbotService.passThreadControl(webhook_standby.sender.id, "primary");
                        chatbotService.takeControlConversation(webhook_standby.sender.id);
                    }
                }

                return;
            }

            //     // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);

            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
};





let handleMessage = (sender_psid, received_message) => {
    //check the incoming message is a quick reply?
    // if (received_message && received_message.quick_reply && received_message.quick_reply.payload) {
    //     let payload = received_message.quick_reply.payload;
    //     if (payload === "CATEGORIES") {
    //         await chatbotService.sendCategories(sender_psid);

    //     } else if (payload === "LOOKUP_ORDER") {
    //         await chatbotService.sendLookupOrder(sender_psid);

    //     } else if (payload === "TALK_AGENT") {
    //         await chatbotService.requestTalkToAgent(sender_psid);
    //     }

    //     return;
    // }


    let response;

    // Check if the message contains text
    if (received_message.text) {
        // Create the payload for a basic text message
        response = {
            "text": `You sent the message: "${received_message.text}". Now send me an image!`
        }
    } else if (received_message.attachments) {
        // Get the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Is this the right picture?",
                        "subtitle": "Tap a button to answer.",
                        "image_url": attachment_url,
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Yes!",
                                "payload": "yes",
                            },
                            {
                                "type": "postback",
                                "title": "No!",
                                "payload": "no",
                            }
                        ],
                    }]
                }
            }
        }
    }

    // Sends the response message
    callSendAPI(sender_psid, response);
};

let handlePostback= async (sender_psid, received_postback)=> {
    let response;
    
    // Get the payload for the postback
    let payload = received_postback.payload;
  
    // Set the response based on the postback payload
    switch (payload) {
        case "تحدث مع عميل":
            response ={"text":"thanks"};
            break;
        case "no":
            response = {"text":"ggggggg"};
            break;
        case "GET_STARTED":
            let username = await homepageService.getFacebookUsername(sender_psid);
            response = {"text":`Hi there. ${username}`};
            break;
        default:
            console.log("run default switch case")

    }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
  };



let callSendAPI=(sender_psid, response) => {

        // Construct the message body
    let request_body = {
    "recipient": {
        "id": sender_psid
    },
    "message": response
    }

    // Send the HTTP request to the Messenger Platform
    request({
    "uri": "https://graph.facebook.com/v7.0/me/messages",
    "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
    }, (err, res, body) => {
    if (!err) {
        console.log('message sent!')
    } else {
        console.error("Unable to send message:" + err);
    }
    }); 
}

let handleSetupProfile = async(req,res)=>{
    try {
       await homepageService.handleSetupProfileAPI();
        return res.redirect("/");
    } catch (e) {
        console.log(e);
    }
};

let getSetupProfilePage = (req, res) => {
    return res.render("profile.ejs");
};


module.exports = {
    getHomePage: getHomePage,
    getWebhook: getWebhook,
    postWebhook: postWebhook,
    handleSetupProfile: handleSetupProfile,
    getSetupProfilePage: getSetupProfilePage,
    // getInfoOrderPage: getInfoOrderPage,
    // setInfoOrder: setInfoOrder

};



