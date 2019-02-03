const express = require ('express');
const bodyParser = require('body-parser')
const cors = require('cors')
const bcrypt = require('bcrypt-nodejs')
const Clarifai = require ('clarifai');

const knex = require('knex')({
  	client: 'pg',
  	connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : '1234',
    database : 'face'
  }
});


const app = express()

app.use(bodyParser.json())

app.use(cors())


app.get('/', (req, res)=>{
	res.send('THIS IS WORKING')
})

app.post('/signin', (req, res)=>{
	const {email, password, name} = req.body
	if(!email || !password ){
		return res.status(400).json('unable to login')
	}
	knex.select('email','hash').from('login')
	.where('email','=',email)
	.then(data=>{
		const isValid = bcrypt.compareSync(password, data[0].hash);
		if(isValid){
			return knex.select('*').from ('users')
			.where('email','=',email)
			.then(user=>{
				res.json(user[0])
			})
			.catch(err=>{
				res.status(400).json('user not found')
			})
		}
	})
	.catch(err=>{
		res.status(400).json('wrong credentials')
	})
})



app.post('/register',(req,res)=>{
	const {email, password, name} = req.body
	if(!email || !name || !password ){
		return res.status(400).json('wrong credentials')
	}
	const hash = bcrypt.hashSync(password);
		knex.transaction(trx=>{
			trx.insert({
				hash:hash,
				email: email
			})
			.into('login')
			.returning('email')
			.then(loginEmail=>{
				return trx ('users')
				.returning('*')
				.insert({
					name: name,
					email: loginEmail[0],
					entries: 0,
					joined: new Date()
				})
				.then(user=>{
					res.json(user)
				})
			})
			.then(trx.commit)
			.catch(trx.rollback)
		})
	.catch(err=>{
		res.status(400).json('email already exist')
	})
})



app.post('/imageurl',(req, res)=>{
	const app = new Clarifai.App({apiKey: 'c5a5410e52f74a449fcdfd273b330c64'})
	app.models
        .predict(Clarifai.FACE_DETECT_MODEL,req.body.input)
        .then(data=>{
        	res.json(data)
        })
        .catch(err=>res.status(400).json('unable to get data'))
})


app.put('/image',(req, res)=>{
	knex('users')
		.where('id', '=', req.body.id)
		.increment('entries', 1)
		.returning('entries')
		.then(entries=>{
			res.json(entries[0])
		})	
		.catch(err=>{
			res.status(400).json('unable to count entries')
		})
})



app.listen(process.env.PORT || 3000,()=>{
	console.log('this server is running')
})