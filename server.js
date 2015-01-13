var cheerio = require("cheerio");
var request = require("request");
var moment = require("moment");

// http://www.coasthockey.com/viewSchedules.aspx?TeamID=<teamid>&LeagueID=<leagueid>&SeasonID=<seasonid>
var url = process.env.CHL_TEAM_SCHEDULE_URL;

request(url, processScheduleHtml);


function processScheduleHtml(err, resp, html) {
    var $ = cheerio.load(html);
    var games = [];
  
    var title = $('#lblTitle').text();
    var teamName = /schedule:(.+)/i.exec(title)[1].trim();
  
    var gameRows = $('#pnlViewTeamSchedules table:first-child tr');
  
    gameRows.map(function(idx, row) {
        var gameRow = $(row);
    
        if (!gameRow.has('td.table-content1, td.table-content2').length) return;
    
        var cells = gameRow.find('td');

        var date = moment(cells.first().text());
        var rink = cells.eq(1).text().trim();
        var homeTeamName = cells.eq(2).find('a').text().trim();
        var awayTeamName = cells.eq(3).find('a').text().trim();
        var score = parseScoreText(cells.eq(4).text().trim());
        var result = getResult(score.home, score.away, teamName === homeTeamName)

        console.log(date.toString(), rink, homeTeamName, awayTeamName, score.home, score.away, result);
    });
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
    if (homeScore === awayScore) {
        result = 'Tie';
    } else if (isHomeTeam && homeScore > awayScore ||
              !isHomeTeam && awayScore > homeScore) {
        result = 'Win';
    } else {
        result = 'Loss';
    }
    return result;
}