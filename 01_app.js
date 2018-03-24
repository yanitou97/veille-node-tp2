const express = require('express');
const fs = require('fs')
const util = require("util");
const app = express();
const server = require('http').createServer(app);
const io = require('./mes_modules/chat_socket').listen(server);
const peupler = require('./mes_modules/peupler')
const bodyParser= require('body-parser')
const MongoClient = require('mongodb').MongoClient // le pilote MongoDB
const ObjectID = require('mongodb').ObjectID;
const i18n = require('i18n');
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}))
/* on associe le moteur de vue au module «ejs» */
app.use(express.static('public'));

i18n.configure({ 
   locales : ['fr', 'en'],
   cookie : 'langueChoisie', 
   directory : __dirname + '/locales' })
app.use(i18n.init);


let db // variable qui contiendra le lien sur la BD

MongoClient.connect('mongodb://127.0.0.1:27017', (err, database) => {
 if (err) return console.log(err)
 db = database.db('membres')

// lancement du serveur Express sur le port 8081
 server.listen(8081, (err) => {
 if (err) console.log(err)
 let host = server.address().address
 let port = server.address().port 
 console.log('connexion à la BD et on écoute sur le port ' + port)
 })
})


/*
Les routes
*/

////////////////////////////////////////// Route /
app.set('view engine', 'ejs'); // générateur de template

app.get('/:local(en|fr)', function(req, res) {
	console.log("req.params.local = " + req.params.local)
	res.cookie('langueChoisie', req.params.local)
	res.setLocale(req.params.local)
	res.redirect(req.get('referer'))
})

app.get('/', function (req, res) {
      
 res.render('accueil.ejs')  
 
  });

//////////////////////////////////////////  Route liste
app.get('/liste', function (req, res) {
   var cursor = db.collection('membres')
                .find().toArray(function(err, resultat){
 if (err) return console.log(err)        
 res.render('membre.ejs', {membres: resultat})   
  });
})
//////////////////////////////////////////  Route Rechercher
app.post('/rechercher',  (req, res) => {
   let recherche = req.body.recherche.toLowerCase()
   let regRecherche = new RegExp(recherche, 'i')
   var match = regRecherche.exec(recherche);
	console.log("match[0] = " + match[0]); 
	console.log("match[1] = " + match[1]); 

   console.log(recherche)
   let cursor = db.collection('membres')
                .find({$or: [ 
                				{nom: {$regex :regRecherche, $options: "$i"}},
                			  {prenom: {$regex :regRecherche, $options: "$i"}},
                			 	{telephone: {$regex :regRecherche, $options: "$i"}},
                				{courriel: {$regex :regRecherche, $options: "$i"}}
                			]
                		}).toArray(function(err, resultat){
 if (err) return console.log(err)        
 res.render('membres.ejs', {membres: resultat, recherche:recherche})   
  });
})
////////////////////////////////////////// Route /ajouter
/*app.post('/ajouter', (req, res) => {
console.log('route /ajouter')	
 db.collection('membres').save(req.body, (err, result) => {
 if (err) return console.log(err)
 // console.log(req.body)	
 console.log('sauvegarder dans la BD')
 res.redirect('/liste')
 })
})

////////////////////////////////////////  Route /modifier
app.post('/modifier', (req, res) => {
console.log('route /modifier')
// console.log('util = ' + util.inspect(req.body));
req.body._id = 	ObjectID(req.body._id)
 db.collection('membres').save(req.body, (err, result) => {
	 if (err) return console.log(err)
	 console.log('sauvegarder dans la BD')
	 res.redirect('/liste')
	 })
})


////////////////////////////////////////  Route /detruire
app.get('/detruire/:id', (req, res) => {
 console.log('route /detruire')
 // console.log('util = ' + util.inspect(req.params));	
 var id = req.params.id
 console.log(id)
 db.collection('membres')
 .findOneAndDelete({"_id": ObjectID(req.params.id)}, (err, resultat) => {

if (err) return console.log(err)
 res.redirect('/liste')  // redirige vers la route qui affiche la collection
 })
})*/


///////////////////////////////////////////////////////////   Route /trier
app.get('/trier/:cle/:ordre', (req, res) => {

 let cle = req.params.cle
 let ordre = (req.params.ordre == 'asc' ? 1 : -1)
 let cursor = db.collection('membres').find().sort(cle,ordre).toArray(function(err, resultat){

  ordre = (req.params.ordre == 'asc' ? 'desc' : 'asc')  
 res.render('liste.ejs', {membress: resultat, cle, ordre })	
})

}) 
/////////////////////////////////////////////////////////  Route /peupler
app.get('/peupler', (req, res) => {
	let collectionMembre = peupler()
	console.log(collectionMembre)
	/*
	for (elm of tabMembre)
	{
	let cursor = db.collection('membres').save(elm, (err, res)=>{
		if(err) console.error(err)
			console.log('ok')

		})
	}
	*/

	let cursor = db.collection('membres').insertMany(collectionMembre, (err, resultat)=>{
		if(err) console.error(err)
			// console.log('ok')
			// console.log(util.inspect(resultat))
			res.redirect('/liste')
		})
})

/////////////////////////////////////////////////////////  Route /peupler
app.get('/vider', (req, res) => {

	let cursor = db.collection('membres').drop((err, res)=>{
		if(err) console.error(err)
			console.log('ok')
			
		})
	res.redirect('/liste')
})

app.get('/profil/:id', (req, res) => {
    let cursor = db.collection('membres')
                .find({"_id": ObjectID(req.params.id)}).toArray(function(err, resultat){
    if (err) return console.log(err)        
    // transfert du contenu vers la vue index.ejs (renders)
    // affiche le contenu de la BD
    res.render('profil.ejs', {membres: resultat}) 

 }) 
})

app.post('/ajax_modifier', (req,res) => {
   req.body._id = ObjectID(req.body._id)
   console.log(util.inspect(req.body));
   console.log('route /ajax_modifier')
   db.collection('membres').save(req.body, (err, result) => {
   if (err) return console.log(err)
       console.log('sauvegarder dans la BD')
   res.send(JSON.stringify(req.body));
   // res.status(204)
   })
})

app.get('/ajax_detruire/:id', (req,res) => {
   	var id = req.params.id
 	console.log(id)
 	db.collection('membres')
 	.findOneAndDelete({"_id": ObjectID(req.params.id)}, (err, resultat) => {

	if (err) return console.log(err)
 		res.send(JSON.stringify(ObjectID(req.params.id)));  // redirige vers la route qui affiche la collection
   	})
})

app.post('/ajax_ajouter', (req,res) => {
   db.collection('membres').insert(req.body, (err, result) => {
   if (err) return console.log(err)
       console.log('sauvegarder dans la BD')
   		res.send(JSON.stringify(req.body));
   // res.status(204)
   })
})

/////////////////////////////////////////////////////////// Route /chat
app.get('/chat', (req, res) => {
	res.render('socket_vue.ejs')
})


