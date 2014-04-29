/*
 * Iterated prisoner's dilemma
 *
 * References on the game:
 *
 *   - Poundstone, William. "Prisoner's Dilemma". Doubleday, 1992.
 *     Read the whole thing. Chapter 12, "Survival of the Fittest", deals with
 *     evolution and Prisoner's Dilemma computer tournaments.
 *
 *   - Radiolab. "The Good Show".
 *     http://www.radiolab.org/story/103951-the-good-show/
 */

/*
 * Constants used throughout. In Dilemma, on each turn, there are only two
 * options: cooperate or defect.
 */
var COOPERATE = "COOPERATE", DEFECT = "DEFECT";


/*
 * === Examples
 *
 * We'll start easy. Here are the two simplest possible strategies for playing
 * Dilemma.
 */

function* goodGuyGreg() {
    // Good Guy Greg always does the right thing.
    while (true)          // crashes on your couch
        yield COOPERATE;  // makes breakfast
}

function* scumbagSteve() {
    // Scumbag Steve is just a jerk.
    while (true)          // hey can i borrow
        yield DEFECT;     // everything
}

/*
 * So it's actually pretty easy even if you don't really understand generators.
 * `yield` is the keyword you use when you're ready to make your move.
 */

/*
 * Of course you may wish to take into account what your opponent is doing.
 * The `yield` operator returns your opponent's move.
 */
function* HighExpectationsAsianFather() {
    // High Expectations Asian Father always cooperates,
    // as long as he senses that you are trying.
    var otherPlayerMove;
    do {
        otherPlayerMove = yield COOPERATE;
    } while (otherPlayerMove === COOPERATE);

    // If we get here, you have disappointed me.
    // I have no son.
    while (true)
        yield DEFECT;
}


var Dilemma = (function () {
    function Match(player1, player2, rounds) {
        this.round = 0;
        this.roundLimit = rounds;
        this.score1 = this.score2 = 0;
        this.lastMove1 = this.lastMove2 = undefined;
        this.lastScore1 = this.lastScore2 = undefined;
        this.status = Match.paused;

        // this._g1 and ._g2 are populated in setupMatchPlayer.
        setupMatchPlayer(this, 1, player1) &&
        setupMatchPlayer(this, 2, player2);
    }

    function setupMatchPlayer(match, n, genfn) {
        var gen;
        try {
            gen = genfn();
        } catch (exc) {
            // Forfeit.
            // Set the other player's score to 5N.
            match.status = Match.done;
            match["score" + (3 - n)] = match.roundLimit * 5;

            try {
                console.error(exc);
            } catch (_) {
            }

            return false;
        }
        match["_g" + n] = gen;
        return true;
    }

    Match.paused = "Dilemma.Match.paused";
    Match.running = "Dilemma.Match.running";
    Match.done = "Dilemma.Match.done";

    function getNextMove(match, name, gen, arg) {
        var result = gen.next(arg);
        if (result.done) {
            match._logError(new Error("Player " + name + " returned without yielding!"));
            return undefined;
        }
        var move = result.value;
        if (move !== COOPERATE && move !== DEFECT) {
            match._logError(new Error("Player " + name + " made an illegal move (please yield COOPERATE or DEFECT)"));
            return undefined;
        }
        console.log("Player " + name + ": " + move);
        return move;
    }

    Match.prototype.playRound = function playRound() {
        if (this.status === Match.running)
            throw new Error("Dilemma.Match.playRound: The match is already running.");
        if (this.status === Match.done)
            throw new Error("Dilemma.Match.playRound: The match is already over.");
        this.status = Match.running;

        var self = this;
        return new Promise(function (resolve, reject) {
            console.log("Round " + (self.round + 1) + ":");

            // Pass each player the other player's previous move.
            var move1 = getNextMove(self, 1, self._g1, self.lastMove2);
            var move2 = getNextMove(self, 2, self._g2, self.lastMove1);

            if (move1 === undefined || move2 === undefined) {
                // One or both players failed to return a proper move! Compute forfeit.
                self.scoreChange1 = (move1 === undefined) ? 0 : 5 * (self.roundLimit - self.round);
                self.scoreChange2 = (move2 === undefined) ? 0 : 5 * (self.roundLimit - self.round);
                self.score1 += self.scoreChange1;
                self.score2 += self.scoreChange2;
                self.status = Match.done;
                resolve(self);
                return;
            }

            // Interpret the results and adjust the scores.
            if (move1 === COOPERATE) {
                if (move2 === COOPERATE) {
                    // Both players cooperated.
                    self.scoreChange1 = 3;
                    self.scoreChange2 = 3;
                } else {
                    // Player 2 defected on player 1.
                    self.scoreChange1 = 0;
                    self.scoreChange2 = 5;
                }
            } else {
                if (move2 === COOPERATE) {
                    // Player 1 defected on player 2.
                    self.scoreChange1 = 5;
                    self.scoreChange2 = 0;
                } else {
                    // Both players defected.
                    self.scoreChange1 = 1;
                    self.scoreChange2 = 1;
                }
            }
            self.score1 += self.scoreChange1;
            self.score2 += self.scoreChange2;

            // Remember these moves for the next round.
            self.prevMove1 = move1;
            self.prevMove2 = move2;

            // Are we there yet?
            self.round++;
            self.status = (self.round >= self.roundLimit ? Match.done : Match.paused);
            resolve(self);
        });
    };

    Match.prototype.playMatch = function playMatch() {
        if (this.status === Match.running)
            throw new Error("Dilemma.Match.playMatch: The match is already running.");
        if (this.status === Match.done)
            return Promise.resolve(this);

        var self = this;
        return new Promise(function (resolve, reject) {
            function go() {
                self.playRound().then(function () {
                    if (self.status === Match.done)
                        resolve(self);
                    else
                        go();
                }).catch(reject);
            }
            go();
        });
    };

    function play(player1, player2, rounds) {
        new Match(player1, player2, rounds).playMatch().then(function (match) {
            console.log("Match complete! Final score: " +
                        player1.name + " " + match.score1 + ", " +
                        player2.name + " " + match.score2);
        });
    }

    function Tournament(players, rounds) {
        this.players = players;
        this.matches = [];
        this.scores = [];
        for (var i = 0; i < players.length; i++) {
            this.matches[i] = [];
            this.scores[i] = 0;
            for (var j = 0; j < i; j++)
                this.matches[i][j] = new Match(players[i], players[j], rounds);
        }
    }

    Tournament.prototype.getMatch = function (i1, i2) {
        if (Math.floor(i1) !== i1 || i1 >= this.players.length || Math.floor(i2) !== i2 || i2 >= i1)
            throw new Error("Tournament.getMatch: invalid argument");
        return this.matches[i1][i2];
    };

    Tournament.prototype.getScore = function (i) {
        var score = 0;
        for (var j = 0; j < i; j++)
            score += this.matches[i][j];
        for (var j = i + 1; j < this.players.length; j++)
            score += this.matches[j][i];
        return score;
    };

/*
    Tournament.prototype.playAll = function () {
        TODO
    };
*/

    return {
        Match: Match,
        Tournament: Tournament,

        // legacy API for now
        play: play
    };
})();
