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
    var home = cells.eq(2).find('a').text().trim();
    var away = cells.eq(3).find('a').text().trim();
    var score = cells.eq(4).text().trim();
    
    var match = /(\d+)\s+-\s+(\d+)/.exec(score);
    var result = '';
    if (match) {
      var homeScore = parseInt(match[1]);
      var awayScore = parseInt(match[2]);
      
      if (homeScore === awayScore) {
        result = 'Tie';
      } else if (teamName === home && homeScore > awayScore ||
                 teamName === away && awayScore > homeScore) {
        result = 'Win';
      } else {
        result = 'Loss';
      }
      
      home += " " + homeScore;
      away += " " + awayScore;
    }
    
    console.log(date.toString(), rink, home, away, result);
  });
}
