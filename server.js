"use strict"

const express = require("express");
const mongoose = require("mongoose");

mongoose.Promise = global.Promise

const { PORT, DATABASE_URL } = require("./config");
const { Author, BlogPost } = require("./models");

const app = express();
app.use(express.json());

// AUTHORS - GET
app.get("/authors", (req, res) => {
	Author
		.find()
		.then(authors => {
			res.json(authors.map(author => {
					return {
						id: author._id,
						name: `${author.firstName} ${author.lastName}`,
						userName: author.userName
					}
				}))
			})
		.catch(err => {
			console.error(err);
			res.status(500).json({ message: "Internal server error" });
		})
})

//AUTHORS - POST
app.post("/authors", (req, res) => {
	const requiredFields = ["firstName", "lastName", "userName"];
	for (let i = 0; i <requiredFields.length; i++){
		const field = requiredFields[i];
		if (!(field in req.body)){
			const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
		}
	}

	Author 
		.findOne({userName: req.body.userName})
		.then(author =>{
			if (author){
				const message = "Username already taken";
				console.log(message);
				return res.status(400).send(message);
			} else {
				Author.create({
					firstName: req.body.firstName,
					lastName: req.body.lastName,
					userName: req.body.userName
				})
				.then(author = res.status(201).json({
					_id: author.id,
					name: `${author.firstName} ${author.lastName}`,
					userName: author.userName
				}))
				.catch(err => {
					console.error(err);
					res.status(500).json({ message: "Internal servor error" });
				})
			}
		})
		.catch(err => {
			console.error(err);
			res.status(500).json({message: "Internal servor error"});
		})
})

//AUTHORS - PUT
app.put("/authors/:id", (req, res) => {
	if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
		const message =
      `Request path id (${req.params.id}) and request body id ` +
      `(${req.body.id}) must match`;
    console.error(message);
    return res.status(400).json({ message: message });
	}

	const toUpdate = {};
	const updateableFields = ["firstName", "lastName", "userName"];

	updateableFields.forEach(field => {
		if (field in req.body){
			toUpdate[field] = req.body[field];
		}
	})

	Author
	.findOne({userName: toUpdate.userName})
		.then(author =>{
			if (author){
				const message = "Username already taken";
				console.log(message);
				return res.status(400).send(message);
			} else {
				Author
					.findByIdAndUpdate(req.params.id, {$set: toUpdate})
					.then(author=>{
						res.status(200).json({
							id: author.id,
							name: `${author.firstName} ${author.lastName}`,
							userName: author.userName
						})
					})
					.catch(err =>res.status(500).json({message: "Internal servor error"}));
				}
			})		
})

//AUTHORS - DELETE
app.delete("/authors/:id", (req, res) => {
	BlogPost
		.remove({author: req.params.id})
		.then(() => {
			Author
				.findByIdAndRemove(req.params.id)
				.then(() => {
					console.log(`Author with id \`${req.params.id}\` deleted along with blogposts`);
					res.status(204).json({message: "Delete success"});
				})
		})
		.catch(err => res.status(500).json({ message: "Internal servor error" }));
})


//BLOGPOSTS - GET request
app.get("/posts", (req, res) => {
	BlogPost
		.find()
		.then(posts => {
			res.json({
				posts: posts.map(post => post.serialize())
			});
		})
		.catch(err => {
			console.error(err);
			res.status(500).json({ message: "Internal server error" });
		})
})

//BLOGPOSTS - GET request by id
app.get("/posts/:id", (req, res) => {
	BlogPost
		.findById(req.params.id)
		.then( post => res.json(post.serialize()))
		.catch(err => {
			console.error(err);
			res.status(500).json({ error: "Internal server error" });
		})
})

//BLOGPOSTS - POST request
app.post("/posts", (req, res) => {
	const requiredFields = ["title", "content", "author"];
	for (let i = 0; i <requiredFields.length; i++){
		const field = requiredFields[i];
		if (!(field in req.body)){
			const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
		}
	}

	Author
		.findById(req.body.author_id)
		.then(author => {
			if (author) {
				BlogPost
					.create({
						title: req.body.title,
						content: req.body.content,
						author: req.body.author
				})
				.then(post => res.status(201).json(post.serialize()))
				.catch(err => {
					console.error(err);
					res.status(500).json({ message: "Internal servor error" });
				})
			} else {
				const message = `Author not found`;
				console.error(message);
				return res.status(400).send(message);
			}
		})
		.catch(err => {
					console.error(err);
					res.status(500).json({ message: "Internal servor error" });
				})
})

//BLOGPOSTS - PUT request
app.put("/posts/:id", (req, res) => {
	if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
		const message =
      `Request path id (${req.params.id}) and request body id ` +
      `(${req.body.id}) must match`;
    console.error(message);
    return res.status(400).json({ message: message });
	}

	const toUpdate = {};
	const updateableFields = ["title", "content"];

	updateableFields.forEach(field => {
		if (field in req.body){
			toUpdate[field] = req.body[field];
		}
	})

	BlogPost
		.findByIdAndUpdate(req.params.id, { $set: toUpdate })
		.then(post => res.status(200).json({
			id: post.id,
			title: post.title,
			content: post.content
		}))
		.catch(err => res.status(500).json({ message: "Internal server"}));
})

//BLOGPOSTS - DELETE request
app.delete("/posts/:id", (req, res) => {
	BlogPost
		.findByIdAndRemove(req.params.id)
		.then(post => res.status(204).end())
		.catch(err => res.status(500).json({ message: "Internal servor error" }));
})


//catchall endpoint for requests to non-existent endpoints
app.use("*", function(req, res) {
	res.status(404).json({ message: "Not Found" });
})



let server;

function runServer(databaseUrl, port = PORT) {
	return new Promise((resolve, reject) => {
		mongoose.connect(
			databaseUrl,
			err => {
				if (err) {
					return reject(err);
				}
				server = app
					.listen(port, () => {
						console.log(`Your app is listening on port ${port}`);
						resolve();
					})
					.on("error", err => {
						mongoose.disconnect();
						reject(err);
					});
			}
		)
	})
}

function closeServer() {
	return mongoose.disconnect().then(() => {
		return new Promise((resolve, reject) => {
			console.log("Closing server");
			server.close(err => {
				if (err) {
					return reject(err);
				}
				resolve();
			})
		})
	})
}

if (require.main === module) {
	runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };