// Load up the discord.js library
const Discord = require("discord.js");
const fs = require("fs");

// This is your client. Some people call it `bot`, some people call it `self`, 
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();
//console.log(fs.readFileSync("datastore.json", "utf8"));
var dataStore = JSON.parse(fs.readFileSync("datastore.json", "utf8"));
// Here we load the config.json file that contains our token and our prefix values. 
const config = require("./config.json");
// config.token contains the bot's token
// config.prefix contains the message prefix.

client.on("ready", () => {
    // This event will run if the bot starts, and logs in, successfully.
    //console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.user.setActivity(`meeting new people :)`);
});

client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    //console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    dataStore[guild.id] = {
        "avalon": {
            "inProgress": false,
            "starting": false,
            "owner": null,
            "players": {},
            "collector": null,
            "playerCount": 0
        },
        "stats": {

        }
    }
});

client.on("guildDelete", guild => {
    // this event triggers when the bot is removed from a guild.
    //console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
});


client.on("message", async message => {
    // This event will run on every single message received, from any channel or DM.

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    // and not get into a spam loop (we call that "botception").
    if (message.author.bot) return;

    // Also good practice to ignore any message that does not start with our prefix, 
    // which is set in the configuration file.
    if (message.content.indexOf(config.prefix) !== 0) return;

    // Here we separate our "command" name, and our "arguments" for the command. 
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === "avalon") {
        // makes the bot say something and delete the message. As an example, it's open to anyone to use. 
        // To get the "message" itself we join the `args` back into a string with spaces: 
        // get the guild being managed
        // cdata = dataStore[message.guild.id];
        if (args.length === 0) {
            message.channel.send(
                `Avalon can be played using the following commands:
+avalon open: opens an avalon game. The opener becomes the leader of the current game.
+avalon start: begins an open avalon game
+avalon roles (morgana assassin percival merlin squish squish): the roles for the current game
+avalon mission: tag the people going on a mission when the group agrees on a mission
+avalon mission cancel: cancel an ongoing mission
+avalon spectate: get the rolelist of a game you're not in
+avalon end (evil / good): end the current game. If evil / good is supplied, a win is given to them`
            );
        }
        else if (args[0] === "open") {
            var collectorMessage = await message.channel.send(`Avalon game created by ${message.author.username} open, react to join.`);
            dataStore[message.guild.id]["avalon"]["inProgress"] = true;
            dataStore[message.guild.id]["avalon"]["starting"] = true;
            dataStore[message.guild.id]["avalon"]["owner"] = message.author.id;
            dataStore[message.guild.id]["avalon"]["players"] = {};
            var reactionCollector = collectorMessage.createReactionCollector((reaction, user) => true);
            reactionCollector.on("collect", (reaction, user) => {
                dataStore[message.guild.id]["avalon"]["players"][user.id] = {
                    "playing": true,
                    "waiting": false,
                    "userData": user
                };
            });
            reactionCollector.on("dispose", (reaction, user) => {
                dataStore[message.guild.id]["avalon"]["players"][user.id] = {
                    "playing": false,
                    "waiting": false,
                    "userData": user
                };
            });
            dataStore[message.guild.id]["avalon"]["collector"] = reactionCollector;
            ////console.log(JSON.stringify(dataStore));
            fs.writeFileSync("datastore.json", JSON.stringify(dataStore));
        }
        else if (args[0] === "start") {
            if (dataStore[message.guild.id]["avalon"]["starting"] && message.author.id === dataStore[message.guild.id]["avalon"]["owner"]) {

                // begin the game
                // send a player list
                var playerusernames = [];
                for (var user in dataStore[message.guild.id]["avalon"]["players"]) {
                    playerusernames.push(dataStore[message.guild.id]["avalon"]["players"][user].userData.username);
                    if (!dataStore[message.guild.id]["avalon"]["players"][user].playing) {
                        delete dataStore[message.guild.id]["avalon"]["players"][user];
                    }
                }
                if (playerusernames.length >= 0) {
                    dataStore[message.guild.id]["avalon"]["starting"] = false;
                    dataStore[message.guild.id]["avalon"]["collector"].stop();
                    dataStore[message.guild.id]["avalon"]["playerCount"] = playerusernames.length;
                    message.channel.send("Players: " + playerusernames.join(", ") + ". Send a role list to start");
                    ////console.log(JSON.stringify(dataStore));

                    fs.writeFileSync("datastore.json", JSON.stringify(dataStore));
                }
                else {
                    message.channel.send("Only " + playerusernames.length + " players are playing. At least 5 are needed for a game.");
                }
            }
        }
        else if (args[0] === "roles") {
            // get the roles in
            dataStore[message.guild.id]["avalon"]["rolelist"] = {};
            var validroles = ["mordred", "morgana", "assassin", "merlin", "percival", "squish", "oberon"];
            var infolookup = {
                "mordred": ["morgana", "assassin"],
                "morgana": ["assassin", "mordred"],
                "assassin": ["mordred", "morgana"],
                "merlin": ["morgana", "assassin", "oberon"],
                "percival": ["morgana", "merlin"],
                "squish": [],
                "oberon": []
            };
            for (var i = 0; i < validroles.length; i++) {
                dataStore[message.guild.id]["avalon"]["rolelist"][validroles[i]] = [];
            }
            var valid = true;
            var currroles = [];
            for (var i = 1; i < args.length; i++) {
                // roles list
                if (validroles.indexOf(args[i].toLowerCase()) === -1) {
                    valid = false;
                    message.channel.send(args[i] + " is not a role.");
                    break;
                }
                currroles.push(args[i]);

            }
            while (currroles.length < dataStore[message.guild.id]["avalon"]["playerCount"]) {
                currroles.push("squish");
            }
            if (currroles.length > dataStore[message.guild.id]["avalon"]["playerCount"]) {
                message.channel.send("Too many roles!");
                valid = false
            }
            if (valid) {
                var tempdms = [];
                var temproles = [];
                var order = [];
                for (var currplayer in dataStore[message.guild.id]["avalon"]["players"]) {
                    // give a random role
                    var randint = getRandomInt(0, currroles.length - 1);
                    var role = currroles[randint];
                    // dm the player
                    var dm = await dataStore[message.guild.id]["avalon"]["players"][currplayer].userData.createDM();
                    dm.send("You are " + role);
                    tempdms.push(dm);
                    temproles.push(role.toLowerCase());
                    dataStore[message.guild.id]["avalon"]["rolelist"][role.toLowerCase()].push(dataStore[message.guild.id]["avalon"]["players"][currplayer].userData);
                    currroles.splice(randint, 1);
                    order.push(dataStore[message.guild.id]["avalon"]["players"][currplayer].userData.username);
                }
                for (var k = 0; k < temproles.length; k++) {
                    var roleLC = temproles[k];
                    var tosend = [];
                    for (var j = 0; j < infolookup[roleLC].length; j++) {
                        for (var i = 0; i < dataStore[message.guild.id]["avalon"]["rolelist"][infolookup[roleLC][j]].length; i++) {
                            tosend.push(dataStore[message.guild.id]["avalon"]["rolelist"][infolookup[roleLC][j]][i].username);
                        }
                    }
                    tosend = shuffle(tosend);
                    tempdms[k].send("Info: " + tosend.join(", "));
                }
                message.channel.send("Roles have been done and info has been DMed.");
                order = shuffle(order);
                message.channel.send("Order: " + order.join(", "));

                fs.writeFileSync("datastore.json", JSON.stringify(dataStore));
            }

        }
        else if (args[0] === "mission") {
            if (message.author.id === dataStore[message.guild.id]["avalon"]["owner"]) {
                if (args.length > 1 && args[1].toLowerCase() === "cancel") {
                    // lets go
                    dataStore[message.guild.id]["avalon"]["keepTimeout"] = false;
                    for (var cplayer in dataStore[message.guild.id]["avalon"]["players"]) {
                        dataStore[message.guild.id]["avalon"]["players"][cplayer]["waiting"] = false;
                    }
                    message.channel.send("Ended the current mission, if one was in progress.");
                }
                else {
                    // check if every user is in the game
                    var valid = true;
                    var missionusers = [];
                    var notInGame = [];
                    message.mentions.users.forEach((user, key, map) => {
                        missionusers.push(user);
                        if (!dataStore[message.guild.id]["avalon"]["players"].hasOwnProperty(user.id)) {
                            valid = false;
                            notInGame.push(user.username);
                        }
                    });
                    if (!valid) {
                        message.channel.send("Mission doesn't go ahead as these players aren't in the game: " + notInGame.join(", "));
                    }
                    else {
                        dataStore[message.guild.id]["avalon"]["passfail"] = true;
                        dataStore[message.guild.id]["avalon"]["passes"] = 0;
                        dataStore[message.guild.id]["avalon"]["fails"] = 0;
                        dataStore[message.guild.id]["avalon"]["missionCount"] = missionusers.length;
                        dataStore[message.guild.id]["avalon"]["keepTimeout"] = true;
                        message.channel.send("Goes ahead, please dm me your +avalon pass and +avalon fail s. Responses will be revealed in 60s");
                        for (var i = 0; i < missionusers.length; i++) {
                            dataStore[message.guild.id]["avalon"]["players"][missionusers[i].id]["waiting"] = true;
                            var poke = await missionusers[i].createDM();
                            poke.send("Pass or fail? Use +avalon pass to pass and +avalon fail to fail");
                        }
                        setTimeout(endCollection, 60000, message.guild.id, message.channel);
                    }
                }
            }
        }
        else if (args[0] === "end") {
            if (message.author.id === dataStore[message.guild.id]["avalon"]["owner"]) {
                if (args.length > 1) {
                    if (!(args[1] === "good" || args[1] === "evil")) {
                        message.channel.send(args[1] + " is not a valid ending (good / evil).");
                    }
                    else {
                        var teams = {
                            "good": ["merlin", "percival", "squish"],
                            "evil": ["mordred", "morgana", "assassin", "oberon"]
                        };
                        // go through all roles and players
                        for (var workingrole in dataStore[message.guild.id]["avalon"]["rolelist"]) {
                            for (var i = 0; i < dataStore[message.guild.id]["avalon"]["rolelist"][workingrole].length; i++) {
                                // check if the guy has stats: otherwise make them
                                if (!dataStore[message.guild.id]["stats"].hasOwnProperty(dataStore[message.guild.id]["avalon"]["rolelist"][workingrole][i].id)) {
                                    dataStore[message.guild.id]["stats"][dataStore[message.guild.id]["avalon"]["rolelist"][workingrole][i].id] = {
                                        "avalon": {
                                            "merlin": { "win": 0, "lose": 0 },
                                            "percival": { "win": 0, "lose": 0 },
                                            "squish": { "win": 0, "lose": 0 },
                                            "mordred": { "win": 0, "lose": 0 },
                                            "morgana": { "win": 0, "lose": 0 },
                                            "assassin": { "win": 0, "lose": 0 },
                                            "oberon": { "win": 0, "lose": 0 }
                                        }
                                    };
                                }
                                if (teams[args[1]].indexOf(workingrole) !== -1) {
                                    // take a win
                                    dataStore[message.guild.id]["stats"][dataStore[message.guild.id]["avalon"]["rolelist"][workingrole][i].id]["avalon"][workingrole]["win"] += 1;
                                }
                                else {
                                    dataStore[message.guild.id]["stats"][dataStore[message.guild.id]["avalon"]["rolelist"][workingrole][i].id]["avalon"][workingrole]["lose"] += 1;
                                }
                            }
                        }

                        dataStore[message.guild.id]["avalon"] = {
                            "inProgress": false,
                            "starting": false,
                            "owner": null,
                            "players": {},
                            "collector": null,
                            "playerCount": 0
                        };

                        message.channel.send("Ended the current game as a " + args[1] + " win.");

                        fs.writeFileSync("datastore.json", JSON.stringify(dataStore));
                    }
                }
                else {
                    dataStore[message.guild.id]["avalon"] = {
                        "inProgress": false,
                        "starting": false,
                        "owner": null,
                        "players": {},
                        "collector": null,
                        "playerCount": 0
                    };
                    message.channel.send("Ended the current game with no conclusion.");
                    fs.writeFileSync("datastore.json", JSON.stringify(dataStore));
                }
            }
        }
        else if (args[0] === "pass") {
            // figure out which game they're in
            for (var server in dataStore) {
                if (dataStore[server]["avalon"]["players"].hasOwnProperty(message.author.id)) {
                    // are we even waiting?
                    if (dataStore[server]["avalon"]["players"][message.author.id]["waiting"]) {
                        // stop waiting
                        dataStore[server]["avalon"]["players"][message.author.id]["waiting"] = false;
                        message.channel.send("Collected.");
                        dataStore[server]["avalon"]["passes"] += 1;
                        break;
                    }
                }
            }
        }
        else if (args[0] === "fail") {
            // check if they're in the game
            for (var server in dataStore) {
                if (dataStore[server]["avalon"]["players"].hasOwnProperty(message.author.id)) {
                    // are we even waiting?
                    if (dataStore[server]["avalon"]["players"][message.author.id]["waiting"]) {
                        // stop waiting
                        dataStore[server]["avalon"]["players"][message.author.id]["waiting"] = false;
                        message.channel.send("Collected.");
                        dataStore[server]["avalon"]["fails"] += 1;
                        break;
                    }
                }
            }
        }
        else if (args[0] === "spectate") {
            // check if they're in the game
            if (!dataStore[message.guild.id]["avalon"]["players"].hasOwnProperty(message.author.id)) {
                var dm = await message.author.createDM();
                var toSend = "";
                for (var workingrole in dataStore[message.guild.id]["avalon"]["rolelist"]) {
                    toSend += workingrole;
                    toSend += ": " + dataStore[message.guild.id]["avalon"]["rolelist"][workingrole].join(", ") + "\n";
                }
                dm.send(toSend);
            }
        }
    }
    else if (command === "sleep") {
        if (message.author.id === "451457578900258838") {
            message.channel.send("My master has ordered me to sleep. Goodnight :)");
            // save everything
            fs.writeFileSync("datastore.json", JSON.stringify(dataStore));
        }
    }
    else if (command === "stats") {
        if (args[0] === "clear") {
            if (message.author.id === "451457578900258838") {
                message.channel.send("All stats cleared for this server.");
                dataStore[message.guild.id]["stats"] = {};
                // save everything
                fs.writeFileSync("datastore.json", JSON.stringify(dataStore));
            }
        }
        else {
            var toSend = "";
            message.mentions.users.forEach((user, key, map) => {
                // check if they have stats
                if (dataStore[message.guild.id]["stats"].hasOwnProperty(user.id)) {
                    // add this dudes stats
                    toSend += user.username + ": \n";
                    for (var key in dataStore[message.guild.id]["stats"][user.id]["avalon"]) {
                        toSend += key + " - " + dataStore[message.guild.id]["stats"][user.id]["avalon"][key]["win"] + "W/" + dataStore[message.guild.id]["stats"][user.id]["avalon"][key]["lose"] + "L\n";
                    }
                    toSend += "\n";
                }
                else {
                    toSend += user.username + "has no stats. \n\n";
                }
            });
            if (toSend === "") {
                // return own stats
                var user = message.author;
                if (dataStore[message.guild.id]["stats"].hasOwnProperty(user.id)) {
                    // add this dudes stats
                    toSend += user.username + ": \n";
                    for (var key in dataStore[message.guild.id]["stats"][user.id]["avalon"]) {
                        toSend += key + " - " + dataStore[message.guild.id]["stats"][user.id]["avalon"][key]["win"] + "W/" + dataStore[message.guild.id]["stats"][user.id]["avalon"][key]["lose"] + "L\n";
                    }
                    toSend += "\n";
                }
                else {
                    toSend += user.username + "has no stats. \n\n";
                }
            }
            message.channel.send(toSend);
        }
    }
});

client.login(config.token);

function endCollection(guildId, channel) {
    if (dataStore[guildId]["avalon"]["inProgress"] && dataStore[guildId]["avalon"]["keepTimeout"]) {
        if (dataStore[guildId]["avalon"]["passes"] + dataStore[guildId]["avalon"]["fails"] === dataStore[guildId]["avalon"]["missionCount"]) {
            dataStore[guildId]["avalon"]["keepTimeout"] = false;
            channel.send(dataStore[guildId]["avalon"]["fails"] + " fails, " + dataStore[guildId]["avalon"]["passes"] + " passes.");
        }
        else {
            channel.send("Still waiting on some passes and fails, 60 more seconds");
            setTimeout(endCollection, 60000, guildId, channel);
        }
    }
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
