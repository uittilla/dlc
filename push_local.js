var bs     = require('nodestalker'),
    client = bs.Client();

var sources = [
    "http://www.wheretogambleuk.com/the-best-of-online-roulette/",
    "http://www.classicslotscasino.com/uk-lucky-nugget.html",
    "http://www.thenewcasinos.com/",
    "http://online-bingo-game.co.uk/lucky-nugget",
    "http://www.theslotsmachinesonline.com/",
    "http://www.poker-weblog.com/popularity-of-online-slots/",
    "http://www.bonus-betting.com/",
    "http://www.gamblingpress.co.uk/finding-a-great-online-casino/",
    "http://www.onlinepokertips.eu/CasinoPromotions.html",
    "http://www.livecasino24h.org/playblackjack.html",
    "http://www.crapsfan.com/articles/blackjack-lucky-nugget.html",
    "http://www.original-gamer.com/article/1819-What-Happened-to-Poker-Video-Games",
    "http://tech4idiots.org/2012/06/27/improvements-in-mobile-gaming-technology/",
    "http://www.poker-galaxy.com/types-of-poker/",
    "http://technologycurrent.com/is-the-future-of-gaming-mobile",
    "http://allgamesofchance.com/the-gaming-club-online-casino.htm",
    "http://video-and-poker.com/?p=28",
    "http://pokerpromotionsgiant.com/tips-for-playing-in-blackjack-tournaments.htm",
    "http://www.gamblingbuzz.co.uk/tips-for-winning-at-blackjack",
    "http://www.sportbookonlinegambling.com/gaming.html",
    "http://www.getslotsmachines.com/",
    "http://www.playfreeslots.org.uk",
    "http://www.supremebetcasino.info/want-to-win-an-online-jackpot.html",
    "http://www.online-casino-world.com/casino_software.html",
    "http://www.jackpotcity-onlinecasino.com/roulette-online/",
    "http://www.freeblackjackportal.com/articles/lucky-nugget-blackjack.html",
    "http://www.reelfilm.com/dcjb.htm#casino",
    "http://www.cardgamesexpert.com/casino-card-games.html",
    "http://bigfourza.com/blog/2012/08/more-top-clubs-sign-up-for-2012-nextgen-series/"
];

client.use('phantom').onSuccess(function(data) {
   for(var i in sources) {
       console.log(sources[i]);
       client.put(sources[i]).onSuccess(function(data) {});
   }
});

