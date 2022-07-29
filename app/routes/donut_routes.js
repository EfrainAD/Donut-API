// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for donuts
const Donut = require('../models/donut')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { example: { title: '', text: 'foo' } } -> { example: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /donuts
router.get('/donuts', requireToken, (req, res, next) => {
	Donut.find()
		.then((donuts) => {
			// `donuts` will be an array of Mongoose documents
			// we want to convert each one to a POJO, so we use `.map` to
			// apply `.toObject` to each one
			return donuts.map((donut) => donut.toObject())
		})
		// respond with status 200 and JSON of the donuts
		.then((donuts) => res.status(200).json({ donuts: donuts }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// SHOW
// GET /donuts/5a7db6c74d55bc51bdf39793
router.get('/donuts/:id', requireToken, (req, res, next) => {
	// req.params.id will be set based on the `:id` in the route
	Donut.findById(req.params.id)
		.then(handle404)
		// if `findById` is succesful, respond with 200 and "donut" JSON
		.then((donut) => res.status(200).json({ donut: donut.toObject() }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// CREATE
// POST /donuts
router.post('/donuts', requireToken, (req, res, next) => {
	// set owner of new donut to be current user
	req.body.donut.owner = req.user.id

	Donut.create(req.body.donut)
		// respond to succesful `create` with status 201 and JSON of new "donut"
		.then((donut) => {
			res.status(201).json({ donut: donut.toObject() })
		})
		// if an error occurs, pass it off to our error handler
		// the error handler needs the error message and the `res` object so that it
		// can send an error message back to the client
		.catch(next)
})

// UPDATE
// PATCH /donuts/5a7db6c74d55bc51bdf39793
router.patch('/donuts/:id', requireToken, removeBlanks, (req, res, next) => {
	// if the client attempts to change the `owner` property by including a new
	// owner, prevent that by deleting that key/value pair
	delete req.body.donut.owner

	Donut.findById(req.params.id)
		.then(handle404)
		.then((donut) => {
			// pass the `req` object and the Mongoose record to `requireOwnership`
			// it will throw an error if the current user isn't the owner
			requireOwnership(req, donut)

			// pass the result of Mongoose's `.update` to the next `.then`
			return donut.updateOne(req.body.donut)
		})
		// if that succeeded, return 204 and no JSON
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// DESTROY
// DELETE /donuts/5a7db6c74d55bc51bdf39793
router.delete('/donuts/:id', requireToken, (req, res, next) => {
	Donut.findById(req.params.id)
		.then(handle404)
		.then((donut) => {
			// throw an error if current user doesn't own `donut`
			requireOwnership(req, donut)
			// delete the donut ONLY IF the above didn't throw
			donut.deleteOne()
		})
		// send back 204 and no content if the deletion succeeded
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

module.exports = router
