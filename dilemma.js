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

var COOPERATE = "COOPERATE", DEFECT = "DEFECT";

function* goodGuyGreg() {
    while (true)
        yield COOPERATE;
}

function* scumbagSteve() {
    while (true)
        yield DEFECT;
}

function* highExpectationsAsianFather() {
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
    // This function is the "driver", you can think of it as the game show
    // host, or referee if you prefer, that prompts the players when it's
    // their turn and enforces the rules.
    function play(player1, player2, rounds) {
        var gen1 = player1(), score1 = 0, prev1 = undefined;
        var gen2 = player2(), score2 = 0, prev2 = undefined;
        for (var i = 0; i < rounds; i++) {
            console.log("Round " + i + ":");

            // Pass each player the other player's previous move.
            var move1 = getNextMove("1", gen1, prev2);
            var move2 = getNextMove("2", gen2, prev1);

            // Interpret the results and adjust the scores.
            if (move1 === COOPERATE) {
                if (move2 === COOPERATE) {
                    score1 += 3;
                    score2 += 3;
                } else {
                    // Player 2 defected on player 1.
                    score2 += 5;
                }
            } else {
                if (move2 === COOPERATE) {
                    // Player 1 defected on player 2.
                    score1 += 5;
                } else {
                    // Both players defected.
                    score1 += 1;
                    score2 += 1;
                }
            }

            // Remember these moves for the next round.
            prev1 = move1;
            prev2 = move2;
        }
        console.log("Final scores: Player 1: " + score1 + ", Player 2: " + score2);
        return [score1, score2];
    }

    function getNextMove(name, gen, arg) {
        var result = gen.next(arg);
        if (result.done)
            throw new Error("Player " + name + " returned without yielding!");
        var move = result.value;
        if (move !== COOPERATE && move !== DEFECT)
            throw new Error("Player " + name + " made an illegal move (please yield COOPERATE or DEFECT)");
        console.log("Player " + name + ": " + move);
        return move;
    }

    return {play: play};
})();
