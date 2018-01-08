require('dotenv').config();
const Crawler = require('crawler');
const chalk = require('chalk');
const figlet = require('figlet');
const config = require('./config');
const _ = require('lodash');

let searchCount = 1;

// CONFIG
const twitterNames = config.twitterNames; // twitter accounts to search
const keywords = config.keywords; // keywords to match
const count = config.tweets; // amount of tweets to return per twitter account

const c = new Crawler({
  maxConnections: twitterNames.length,
  jQuery: false,
  rateLimit: config.rateLimit
});

const tasks = twitterNames.map(name => {
  return {
    method: 'GET',
    url: `https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=${name}&count=${count}`,
    headers: {
      Authorization: `Bearer ${process.env.TWITTER_ACCESS_TOKEN}`
    },
    preRequest: function(options, done) {
      console.log(chalk.underline.green.bold(`Searching.. @${name}`));
      done();
    },
    callback: function(err, res, done) {
      if (err) console.error(chalk.red(err));

      const response = JSON.parse(res.body);
      const mappedResponse = response
        .map(e => {
          return e.text.split(' ');
        })
        .filter(
          e =>
            _.intersection(e, keywords).length >=
            (config.matchAllKeywords === true ? config.keywords.length : config.keywordsToMatch)
        )
        .map(e => e.join(' '))
        .map(e => e.replace(/(\r\n|\n|\r)/gm, ' ').trim() + ' ');

      mappedResponse.length
        ? buildOutput(mappedResponse, name)
        : console.log(`No recent tweets matching your keywords for @${name}`);
      done();
    }
  };
});

// format output
function buildOutput(data, name) {
  data.forEach(e => console.log(e + '\n'));

  console.log(
    chalk.red.bgBlack.bold(
      `Found ${data.length} tweet(s) from @${name}, matching your keywords..` + '\n'
    )
  );
}

// header message
console.log(chalk.yellow(figlet.textSync('snkrTwttr', { horizontalLayout: 'full' })));

// start queue
c.queue(tasks);

// restart search once queue is finished
c.on('drain', function() {
  searchCount++;
  console.log('\n');
  console.log(
    chalk.cyan.bgBlack.bold(`Searching again for new tweets.. Search attempt #${searchCount}.`)
  );
  console.log(`----------------------------------------------`);
  c.queue(tasks);
});
