var cheerio = require("cheerio");
var request = require("request");
var moment = require("moment-timezone");
var express = require("express");
var ical = require("ical-generator");

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




function downloadCoastSchedule(leagueId, seasonId, teamId, callback) {
    var url = 'http://www.coasthockey.com/viewSchedules.aspx?TeamID=' + teamId +
        '&LeagueID=' + leagueId + '&SeasonID=' + seasonId;
    
    request(url, processScheduleHtml);
    
    function processScheduleHtml(err, resp, html) {
        var $ = cheerio.load(html);
        
        var title = $('#lblTitle').text();
        var teamName = /schedule:(.+)/i.exec(title)[1].trim();
        
        var gameRows = $('#pnlViewTeamSchedules table:first-child tr');
        var games = gameRows.map(function(idx, row) {
            var gameRow = $(row);
            if (gameRow.has('td.table-content1, td.table-content2').length) {
                return getGameInfo(gameRow, teamName);
            }
        }).get();
        
        var schedule = {
            games: games,
            title: title,
            teamName: teamName,
            originalUrl: url
        };
        
        callback(schedule);
    }
}

function getGameInfo(gameRow, teamName) {
    var cells = gameRow.find('td');
    var date = moment.tz(cells.first().text(), 'dddd, MMM D, YYYY HH:mm A', 'America/Los_Angeles');
    var rink = cells.eq(1).text().trim();
    var homeTeamName = cells.eq(2).find('a').text().trim();
    var awayTeamName = cells.eq(3).find('a').text().trim()
    var score = parseScoreText(cells.eq(4).text().trim());
    var gameUrl = cells.last().find('a').attr('href');
    var gameId = (gameUrl) ? /\d+$/.exec(gameUrl)[0] : null;
    
    return {
        date: date,
        rink: rink,
        homeTeamName: homeTeamName,
        awayTeamName: awayTeamName,
        score: score,
        result: getResult(score.home, score.away, teamName === homeTeamName),
        gameUrl: gameUrl,
        gameId: gameId
    };        
}

function parseScoreText(scoreText) {
    var homeScore, awayScore;
    
    var match = /(\d+)\s+-\s+(\d+)/.exec(scoreText);
    if (match) {
        homeScore = parseInt(match[1]);
        awayScore = parseInt(match[2]);
    }
    
    return {
        home: homeScore,
        away: awayScore
    };
}

function getResult(homeScore, awayScore, isHomeTeam) {
    if (typeof homeScore === 'undefined') {
        result = '';
    } else if (homeScore === awayScore) {
        result = 'Tie';
    } else if (isHomeTeam && homeScore > awayScore ||
              !isHomeTeam && awayScore > homeScore) {
        result = 'Win';
    } else {
        result = 'Loss';
    }
    
    return result;
}

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