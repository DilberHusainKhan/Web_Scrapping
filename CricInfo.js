//node CricInfo.js --excel worldcup.csv  --datafolder data --source "https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results"

let minimist = require('minimist');
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");


let args = minimist(process.argv);
//console.log(args.source);

let responseKaPromise = axios.get(args.source);
responseKaPromise.then(function (response) {
    let html = response.data;
    //console.log(html);
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    let matches = [];
    let matchdivs = document.querySelectorAll("div.match-score-block");

    //console.log(matchdivs.length);
    for (let i = 0; i < matchdivs.length; i++) {
        let matchdiv = matchdivs[i];
        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""
        };

        //teams name
        let teamsParas = matchdiv.querySelectorAll("div.name-detail>p.name");
        match.t1 = teamsParas[0].textContent;
        match.t2 = teamsParas[1].textContent;
        //teams scores
        let scoreSpan = matchdiv.querySelectorAll("div.score-detail>span.score")
        if (scoreSpan.length == 2) {
            match.t1s = scoreSpan[0].textContent;
            match.t2s = scoreSpan[1].textContent;
        } else if (scoreSpan.length == 1) {
            match.t1s = scoreSpan[0].textContent;
            match.t2s = "";
        } else {
            match.t1s = "";
            match.t2s = "";
        }
        //result 
        let resultSpan = matchdiv.querySelector("div.status-text > span");
        match.result = resultSpan.textContent;
        //push data int matches
        matches.push(match);
    }
    //                                           console.log(matches);

    let teams = [];
    for (let i = 0; i < matches.length; i++) {
        putTeamInTeamsArrayIfMissing(teams, matches[i]);
    }
    //console.log(teams);
    for (let i = 0; i < matches.length; i++) {
        putMatchInAppropriateTeam(teams, matches[i]);
    }
    //console.log(teams);  //print object to solve this we use stringfy
    let TeamJSON = JSON.stringify(teams);
    //console.log(TeamJSON);
    fs.writeFileSync("teams.json", TeamJSON, "utf-8"); //used to write json file with name teams.json
    //console(args.excel);
    ceateExcelFile(teams);

    createFolder(teams);

})

function createFolder(teams) {
    fs.mkdirSync(args.datafolder);
    for (let i = 0; i < teams.length; i++) {
        let teamFN = path.join(args.datafolder, teams[i].name);
        fs.mkdirSync(teamFN);

        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(teamFN, teams[i].matches[j].vs + ".pdf");
            createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
        }
    }
}
function createScoreCard(teamName, match, matchFileName) {
    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfScore;
    let t2s = match.oppScore;
    let result = match.result;

    let byteOfPDFTemplate = fs.readFileSync("Template.pdf");
    let pdfDocKaPromise = pdf.PDFDocument.load(byteOfPDFTemplate);
    pdfDocKaPromise.then(function (pdfdoc) {
        let page = pdfdoc.getPage(0);

        page.drawText(t1, {
            x: 320,
            y: 660,
            sixe: 20
        });

        page.drawText(t2, {
            x: 320,
            y: 600,
            size: 20
        });

        page.drawText(t1s, {
            x: 320,
            y: 550,
            size: 20
        });

        page.drawText(t2s, {
            x: 320,
            y: 500,
            size: 20
        });

        page.drawText(result, {
            x: 110,
            y: 428,
            size: 15
        });

        let finalPDFByteKaPromise = pdfdoc.save();
        finalPDFByteKaPromise.then(function (finalPDFByte) {
            fs.writeFileSync(matchFileName, finalPDFByte);
        })
    })
}

function putTeamInTeamsArrayIfMissing(teams, match) {
    //for team 1
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }
    if (t1idx == -1) {
        teams.push({
            name: match.t1,
            matches: []
        });
    }
    //for team2
    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }
    if (t2idx == -1) {
        teams.push({
            name: match.t2,
            matches: []
        });
    }

}

function putMatchInAppropriateTeam(teams, match) {
    //team 1 matches
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }
    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        oppScore: match.t2s,
        result: match.result
    });
    //teams 2 matches
    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }
    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        oppScore: match.t1s,
        result: match.result
    });
}

function ceateExcelFile(teams) {
    let wb = new excel.Workbook();
    var Mystyle1 = wb.createStyle({
        font: {
            color: 'white',
            size: 15,
        },
        fill: {
            type: 'pattern',
            patternType: "solid",
            fgColor: 'green',

        }
    });
    var Mystyle2 = wb.createStyle({
        font: {
            color: 'white',
            size: 15,
        },
        fill: {
            type: 'pattern',
            patternType: "solid",
            fgColor: 'red',

        }
    });
    var MyStyle = wb.createStyle({
        font: {
            size: 15,
            bold: true,
            italic: true,
        },
    });

    // convert string json to real json
    //create sheet for each teams
    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name) //creat sheet with teams name
        sheet.cell(1, 1).string(teams[i].name).style(MyStyle) //print name of teams in cell[1,a]

        // sheet.cell(2, 1).string("Rank  ->") // write rank in cell [2,a]
        // sheet.cell(2, 2).number(teams[i].rank)

        sheet.cell(3, 1).string("Vs").style(MyStyle)
        sheet.cell(3, 2).string("Self Score").style(MyStyle)
        sheet.cell(3, 3).string("Opp. Score").style(MyStyle)
        sheet.cell(3, 4).string("Result").style(MyStyle)
        for (let j = 0; j < teams[i].matches.length; j++) {
            sheet.cell((j + 4), 1).string(teams[i].matches[j].vs).style(Mystyle1);
            sheet.cell((j + 4), 2).string(teams[i].matches[j].selfScore).style(Mystyle1);
            sheet.cell((j + 4), 3).string(teams[i].matches[j].oppScore).style(Mystyle1);
            sheet.cell((j + 4), 4).string(teams[i].matches[j].result).style(Mystyle2)
        }
    }

    wb.write(args.excel);

}
