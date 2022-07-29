const mongoose = require('mongoose')

const donutSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true
		},
		from: {
			type: String,
			required: true
		},
		thoughts: {
			type: String,
		},
		haveEaten: {
			type: Boolean,
			required: true
		},
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
	},
	{
		timestamps: true
	}
)

module.exports = mongoose.model('Donut', donutSchema)
