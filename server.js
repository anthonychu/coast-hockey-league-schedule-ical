var moment = require("moment-timezone");
var express = require("express");
var ical = require("ical-generator");
var downloadCoastSchedule = require("./downloadCoastSchedule");

const DEFAULT_GAME_DURATION_IN_MINUTES = 90;

var port = process.env.PORT || 3000;
var app = express();

app.get('/coast/:leagueid/:seasonid/:teamid', function(req, res) {
    downloadCoastSchedule(req.params.leagueid, req.params.seasonid, req.params.teamid, function(schedule) {
        var cal = createICal(schedule);
        cal.serve(res);
    });
});

app.listen(port);


function createICal(schedule) {
    var cal = ical();
    cal.setDomain('anthonychu.ca').setName(schedule.title);
    
    schedule.games.forEach(function(game) {
        cal.addEvent({
            start: moment(game.date).toDate(),
            end: moment(game.date).add(DEFAULT_GAME_DURATION_IN_MINUTES, 'm').toDate(),
            summary: formatGameSummary(game),
            description: game.result,
            location: game.rink,
            url: game.gameUrl,
            uid: game.gameId
        });
    });
    
    return cal;
}

function formatGameSummary(game) {
    var homeText = game.homeTeamName;
    var awayText = game.awayTeamName;
    
    if (game.score.home && game.score.away) {
        homeText += " " + game.score.home;
        awayText += " " + game.score.away;
    } else {
        homeText += " (home)";
        awayText += " (away)";
    }
    
    return homeText + " - " + awayText;
}