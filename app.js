/*-----------------------------------------------------------------------------
This Bot uses the Bot Connector Service but is designed to showcase whats 
possible on Facebook using the framework. The demo shows how to create a looping 
menu how send things like Pictures, Bubbles, Receipts, and use Carousels. It also
shows all of the prompts supported by Bot Builder and how to receive uploaded
photos, videos, and location.

# RUN THE BOT:

    You can run the bot locally using the Bot Framework Emulator but for the best
    experience you should register a new bot on Facebook and bind it to the demo 
    bot. You can run the bot locally using ngrok found at https://ngrok.com/.

    * Install and run ngrok in a console window using "ngrok http 3978".
    * Create a bot on https://dev.botframework.com and follow the steps to setup
      a Facebook channel. The Facebook channel config page will walk you through 
      creating a Facebook page & app for your bot.
    * For the endpoint you setup on dev.botframework.com, copy the https link 
      ngrok setup and set "<ngrok link>/api/messages" as your bots endpoint.
    * Next you need to configure your bots MICROSOFT_APP_ID, and
      MICROSOFT_APP_PASSWORD environment variables. If you're running VSCode you 
      can add these variables to your the bots launch.json file. If you're not 
      using VSCode you'll need to setup these variables in a console window.
      - MICROSOFT_APP_ID: This is the App ID assigned when you created your bot.
      - MICROSOFT_APP_PASSWORD: This was also assigned when you created your bot.
    * Install the bots persistent menus following the instructions outlined in the
      section below.
    * To run the bot you can launch it from VSCode or run "node app.js" from a 
      console window. 

# INSTALL PERSISTENT MENUS

    Facebook supports persistent menus which Bot Builder lets you bind to global 
    actions. These menus must be installed using the page access token assigned 
    when you setup your bot. You can easily install the menus included with the 
    example by running the cURL command below:

        curl -X POST -H "Content-Type: application/json" -d @persistent-menu.json 
        "https://graph.facebook.com/v2.6/me/thread_settings?access_token=PAGE_ACCESS_TOKEN"
    
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var google = require('google');
var Scraper = require('google-images-scraper');
var recognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/18fc9a6b-6f4a-4bdb-a54d-2e2846af6c1a?subscription-key=ca1fde99c62746bc86551c1a202cb6b3&staging=true&verbose=true&q=');
var intents = new builder.IntentDialog({ recognizers: [recognizer] });

google.resultsPerPage = 2;

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
  console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
  appId: '10d0a4c6-30a2-4ea3-b784-c974b136e44c',
  appPassword: 'fFyPdApDCdeBaSJgJuKZ6sN'
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Middleware
//=========================================================

// Anytime the major version is incremented any existing conversations will be restarted.
bot.use(builder.Middleware.dialogVersion({ version: 1.0, resetCommand: /^reset/i }));

//=========================================================
// Bots Global Actions
//=========================================================

bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });
bot.beginDialogAction('help', '/help', { matches: /^help/i });

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', [
    function(session) {
    // Send a greeting and show help.
    var card = new builder.HeroCard(session)
      .title("Mamma Mia!! Bot")
      .text("The Bot that takes care of you.")
      .images([
                builder.CardImage.create(session, "http://i.imgur.com/AJCB7kT.jpg")
            ]);
    var msg = new builder.Message(session).attachments([card]);

    session.send(msg);
    session.beginDialog('/start');
    }
]);

intents.matches('laundry', '/laundry');
intents.matches('sick', '/doctor');
intents.matches('call mom', '/start');
intents.matches('end', '/end');

bot.dialog('/start', [
    function(session) {
    session.sendTyping();

    setTimeout(function() {
      var response = session.message.text;
      switch (true) {
        case /hi|hello/ig.test(response):
          session.send("Hi darling, how are you?");
          session.send('How can I help you?');
          break;
        default:
          session.send("Yes, Sweety!!");
          session.send('Are you OK?');

          break;
      }
      session.beginDialog('/questions');
    }, 2000);
    }
]);

bot.dialog('/end', [
    function(session) {
    session.sendTyping();

    setTimeout(function() {
      session.endDialog('Ok');
    }, 2000);
    }
]);

bot.dialog('/questions', intents);

var fever;

bot.dialog('/doctor', [
    function(session) {
    builder.Prompts.text(session, 'Oh dear, what\'s wrong?');
    },
    function(session, results, next) {
    var response = results.response;
    if (/hi|hello/ig.test(response)) {
      session.beginDialog('/start');
      return;
    }
    session.sendTyping();
    setTimeout(function() {

      fever = (/sore throat/ig.test(response) && /fever/ig.test(response));
      switch (true) {
        case /sore throat/ig.test(response) || fever:
          next();
          break;
        case /fever/ig.test(response):
          session.send('Oh, I\'m sorry about the fever.');
          session.endDialog('Try to soak a wash cloth in cold water, wring out the excess water and then sponge areas like your armpits, feet, hands and groin to reduce the temperature. That will help you Sweety :)');
          break;
        default:
          session.sendTyping();
          google(response, function(err, res) {
            if (err) console.error(err)
            session.send("Sorry dear I can\'t help you on that :( Anyway, maybe this could help you on ", response);
            var one = res.links[0];
            var msg = new builder.Message(session)
              .attachments([
                                new builder.HeroCard(session)
                                    .title(one.title)
                                    .subtitle(one.description)
                                    .buttons([
                                        builder.CardAction.openUrl(session, one.link)
                                    ])
                            ]);
            session.endDialog(msg);
          });
          break;
      }
    }, 2000);
    },
    function(session) {
    if (/hi|hello/ig.test(session.message.text)) {
      session.beginDialog('/start');
      return;
    }
    var style = builder.ListStyle.button;
    builder.Prompts.choice(session, "About the sore throat: Did you already try some hot milk with honey?", "NO|YES", { listStyle: style });
    },
    function(session, results) {
    var choice = results.response.entity;
    if (/hi|hello/ig.test(choice)) {
      session.beginDialog('/start');
      return;
    }
    switch (true) {
      case /no/ig.test(choice):
        builder.Prompts.text(session, 'Oh Sweety, you\'ve got to!');
        break;
      case /yes/ig.test(choice):
        session.send("OK, then try this: dissolve half a teaspoon of salt in one cup of water. If it's too salty for you, try adding a small amount of honey to sweeten it.");
        session.send("Just remember to spit the water out after gargling!");
        builder.Prompts.text(session, 'Oh Sweety, you\'ve got to!');
        break;
      default:
        break;
    }
    },
    function(session, results) {
    var response = results.response;
    if (/hi|hello/ig.test(response)) {
      session.beginDialog('/start');
      return;
    }
    switch (true) {
      case /swallow/ig.test(response):
        session.send("You would puke your guts out");
        session.endDialog('Get well soon, Sweety!');
        break;
      default:
        if (fever) {
          session.endDialog('About the fever: Soak a wash cloth in cold water, wring out the excess water and then sponge areas like your armpits, feet, hands and groin to reduce the temperature. That will help you Sweety :)');
        } else {
          session.endDialog('Get well soon, Sweety!');
        }

        break;
    }

    }
]);

bot.dialog('/laundry', [
    function(session) {

    session.send('What kind of clothes are you going to wash?');

    // Ask the user to select an item from a carousel.
    var msg = new builder.Message(session)
      .attachmentLayout(builder.AttachmentLayout.carousel)
      .attachments([
                new builder.HeroCard(session)
                    .title("Lights")
                    .images([
                        builder.CardImage.create(session, "http://cdn-img.instyle.com/sites/default/files/styles/684xflex/public/images/2015/07/070615-tips-for-white-laundry-lead.jpg")
                    ])
                    .buttons([
                        builder.CardAction.postBack(session, "select:lights", "Select")
                    ]),
                new builder.HeroCard(session)
                    .title("Colors")
                    .images([
                        builder.CardImage.create(session, "http://www.stretcher.com/resource/photos/shutterstock/shutterstock_71788351.jpg")
                    ])
                    .buttons([
                        builder.CardAction.postBack(session, "select:colors", "Select")
                    ]),
                new builder.HeroCard(session)
                    .title("Darks")
                    .images([
                        builder.CardImage.create(session, "http://communities.dmcihomes.com/wp-content/uploads/2014/08/dark-clothes-in-laundry.jpg")
                    ])
                    .buttons([
                        builder.CardAction.postBack(session, "select:darks", "Select")
                    ])
            ]);
    builder.Prompts.choice(session, msg, "select:lights|select:colors|select:darks");
    },
    function(session, results) {
    if (session.message && /hi|hello/ig.test(session.message.text)) {
      session.beginDialog('/start');
      return;
    }
    var action, item, tip;
    var kvPair = results.response.entity.split(':');

    switch (kvPair[0]) {
      case 'select':
        action = 'selected';
        break;
    }
    switch (kvPair[1]) {
      case 'lights':
        item = "lights";
        session.sendTyping();
        tip = 'wash with soap with warm water.';
        session.sendTyping();
        google('whites clothes washing tips', function(err, res) {
          if (err) console.error(err)
          session.send('To wash %s clothes, you should %s', item, tip);
          var one = res.links[0];
          var msg = new builder.Message(session)
            .attachments([
                                new builder.HeroCard(session)
                                    .title(one.title)
                                    .subtitle(one.description)
                                    .buttons([
                                        builder.CardAction.openUrl(session, one.link)
                                    ])
                            ]);
          session.send("Maybe this could help you on how to wash light clothes.");
          session.endDialog(msg);
        });

        break;
      case 'colors':
        item = "colors";
        tip = 'buy a powerfull detergent and wash with cold water.';
        session.sendTyping();
        google('colors clothes washing tips', function(err, res) {
          if (err) console.error(err)
          session.send('To wash %s clothes, you should %s', item, tip);
          var one = res.links[0];
          var msg = new builder.Message(session)
            .attachments([
                                new builder.HeroCard(session)
                                    .title(one.title)
                                    .subtitle(one.description)
                                    .buttons([
                                        builder.CardAction.openUrl(session, one.link)
                                    ])
                            ]);
          session.send("Maybe this could help you on how to wash colors clothes.");
          session.endDialog(msg);
        });
        break;
      case 'darks':
        item = "darks";
        tip = 'do not mix with other kind of clothes.';
        session.sendTyping();
        google('darks clothes washing tips', function(err, res) {
          if (err) console.error(err)
          session.send('To wash %s clothes, you should %s', item, tip);
          var one = res.links[0];
          var msg = new builder.Message(session)
            .attachments([
                                new builder.HeroCard(session)
                                    .title(one.title)
                                    .subtitle(one.description)
                                    .buttons([
                                        builder.CardAction.openUrl(session, one.link)
                                    ])
                            ]);
          session.send("Maybe this could help you on how to wash dark clothes.");
          session.endDialog(msg);
        });
        break;
    }
    }
]);