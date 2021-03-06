var express = require('express');

var util = require('util');
var io = require('../my_modules/my-socket');
var m_onlineUsers = require('../my_modules/online-users');
var m_processingGames = require('../my_modules/processing-games');

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

var gameIo = io.of('/game');
gameIo.on('connection', function(socket) {
    console.log('Game socket connect - ' + socket.id);
    
    socket.emit('connected');
    
    socket.on('join', function(data) {
        console.log(" Join game: " + util.inspect(data, {showHidden: false, depth: null}));
        //m_onlineUsers.addUser(data.username);
        
        var game = m_processingGames.findGame(data.game_id);
         console.log(" Game: " + util.inspect(game, {showHidden: false, depth: null}) + ' ' + !game);
        if (!game) {
            console.log(' emit game-not-exists');
            socket.emit('game-not-exists');
            return;
            //gameIo.to(game.white.socketId).emit('game-not-exists');
        }
        
        console.log(' is game opened ' + game.status + ' ' + (game.status == 'opened'));
        if (game.status == 'opened') {
            game.status = 'started';
        }
        
        var blackUser = m_onlineUsers.findUser(game.invite.from);
        var whiteUser = m_onlineUsers.findUser(game.invite.to);
        console.log(" Find user - [black user] " + util.inspect(blackUser, {showHidden: false, depth: null})
                  + " [white user] " + util.inspect(whiteUser, {showHidden: false, depth: null}));
        
        if (blackUser) {
            gameIo.to(blackUser.socketId).emit('join', game);
        }
        if (whiteUser) {
            gameIo.to(whiteUser.socketId).emit('join', game);
        }
    });
    
    socket.on('going', function(move) {
        console.log("On going: " + util.inspect(move, {showHidden: false, depth: null}));
        var game = m_processingGames.findGame(move.game_id);
        console.log(" Game going: " + util.inspect(game, {showHidden: false, depth: null}));
        var blackUser = m_onlineUsers.findUser(game.black);
        var whiteUser = m_onlineUsers.findUser(game.white);
        
        //Only active game could go next move.
        if (game.status != 'started') {
            return;
        }
        
        game.moves.push({
            seq: move.seq,
            ordinate: move.ordinate
        });
        
        if (m_processingGames.win(game.boardSize, game.moves)) {
            game.status = 'finished';
            game.winner = game.moves.length % 2 == 1 ? game.black : game.white;
            game.result = game.moves.length % 2 == 1 ? 'Black wins' : 'White win';
            gameIo.to(blackUser.socketId).emit('finished', game);
            gameIo.to(whiteUser.socketId).emit('finished', game);
        } else {
            gameIo.to(blackUser.socketId).emit('going', game.moves);
            gameIo.to(whiteUser.socketId).emit('going', game.moves);
        }
    });
    
    socket.on('drawRequest', function(data) {
        console.log("On drawRequest: " + util.inspect(data, {showHidden: false, depth: null}));
        var me = m_onlineUsers.findUser(data.username);
        var game = m_processingGames.findGame(data.game_id);
        console.log(" Game going: " + util.inspect(game, {showHidden: false, depth: null}));
        var blackUser = m_onlineUsers.findUser(game.black);
        var whiteUser = m_onlineUsers.findUser(game.white);
                
        if (blackUser.username == me.username) {
            gameIo.to(whiteUser.socketId).emit('drawRequest', whiteUser.username);
        } else if (whiteUser.username == me.username) {
            gameIo.to(blackUser.socketId).emit('drawRequest', blackUser.username);
        }
    });
              
    socket.on('drawAccept', function(data) {
        console.log("On drawAccept: " + util.inspect(data, {showHidden: false, depth: null}));
        var me = m_onlineUsers.findUser(data.username);
        var game = m_processingGames.findGame(data.game_id);
        console.log(" Game: " + util.inspect(game, {showHidden: false, depth: null}));
        var blackUser = m_onlineUsers.findUser(game.black);
        var whiteUser = m_onlineUsers.findUser(game.white);
        
        game.status = 'finished';
        game.result = 'draw';
                
        if (blackUser) {
            gameIo.to(blackUser.socketId).emit('finished', game);
        } 
        if (whiteUser) {
            gameIo.to(whiteUser.socketId).emit('finished', game);
        }
    });
        
    socket.on('drawReject', function(data) {
        console.log("On drawReject: " + util.inspect(data, {showHidden: false, depth: null}));
        var me = m_onlineUsers.findUser(data.username);
        var game = m_processingGames.findGame(move.game_id);
        console.log(" Game: " + util.inspect(game, {showHidden: false, depth: null}));
        var blackUser = m_onlineUsers.findUser(game.black);
        var whiteUser = m_onlineUsers.findUser(game.white);
                
        if (blackUser.username == me.username) {
            gameIo.to(whiteUser.socketId).emit('drawReject', whiteUser.username);
        } else if (whiteUser.username == me.username) {
            gameIo.to(blackUser.socketId).emit('drawReject', blackUser.username);
        }
    });
    
    socket.on('resign', function(data) {
        console.log("On resign: " + util.inspect(data, {showHidden: false, depth: null}));
        var me = m_onlineUsers.findUser(data.username);
        var game = m_processingGames.findGame(data.game_id);
        console.log(" Game: " + util.inspect(game, {showHidden: false, depth: null}));
        var blackUser = m_onlineUsers.findUser(game.black);
        var whiteUser = m_onlineUsers.findUser(game.white);
        
        game.winner = (data.username == game.black) ? game.white : game.black;
        game.status = 'finished';
        game.result = data.username + ' resigned.';
                
        if (blackUser) {
            gameIo.to(blackUser.socketId).emit('finished', game);
        } 
        if (whiteUser) {
            gameIo.to(whiteUser.socketId).emit('finished', game);
        }
    });
              
    
});

module.exports = router;
