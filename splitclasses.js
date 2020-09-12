import Duration from './duration.js'

export class BaseArray extends Array {
	#idmapping = {}
	first() {
		return this[0]
	}
	last() {
		return this[this.length - 1]
	}
	previous( item ) {
		return this[this.indexOf(item)-1]
	}
	find ( id ) {
		if ( !this.#idmapping.hasOwnProperty(id) ) {
			let idcheck = this.filter( (a) => {
				return a.id == id
			} )[0]
			if ( idcheck ) {
				this.#idmapping[id] = idcheck
			}
		}
		return this.#idmapping[id]
	}
}


export class Icon {
	image
	constructor( icondata ) {
		var bindata = atob( icondata )
		if ( bindata.length ) {
			var img = bindata.substr(bindata.indexOf('PNG') -1)
			var imag = new Image()
			imag.src = "data:image/png;base64," + btoa(img)
			imag.alt = this.game
			this.image = imag
		}
	}
}

export class SplitGroup {
	name
	startsegment
	endsegment
	segments = new SegmentArray()
	constructor( name, startsegment, endsegment, allsegments ) {
		this.name = name
		this.startsegment = startsegment
		this.endsegment = endsegment
		this.segments = allsegments.slice(startsegment, endsegment)
	}
}

export class Segment {
	id
	name
	originalname
	icon
	rundeaths = 0
	completions = 0
	previoussegment
	bestpace = {
		time: undefined,
		attempt: undefined
	}
	totaltime = new Duration(0)
	constructor(id, name, icon, previoussegment) {
		this.id = id
		this.previoussegment = previoussegment
		this.originalname = name
		if ( name.substr(0,1) == '-') {
			// assuming subsplits
			name = name.substr(1)
		}
		if ( name.substr(0,1) == '{') {
			// assume subsplit group
			name = name.substr( name.indexOf('}') + 2 )
		}
		this.name = name
		this.icon = new Icon(icon)
	}

	get shortName() {
		return this.name.replace( /(\w)[\w]+[\s]?/g, '$1' )
	}
	get attempts() {
		return this.previoussegment.completions
	}
	get average() {
		return this.totaltime.avg( this.completions )
	}
	get successrate() {
		return Math.min(((this.attempts - this.rundeaths)/this.attempts) * 100, 100).toFixed(2) + "%"
	}
}

export class Split {
	segment

	#time // split time not segmenttime
	#segmenttime

	constructor( segment, time, starttime ) {
		this.segment = segment
		if ( time ) {
			this.#time = new Duration( time )
		}

		if ( starttime ) {
			this.#segmenttime = time.sub( starttime )
		}
	}
	get time() {
		return this.#time
	}
	set time(v) {
		this.#time = v
	}
	get segmenttime() {
		return this.#segmenttime
	}
	set segmenttime(v) {
		this.#segmenttime = v
	}
}

export class AverageSplit extends Split {

	constructor( previoussplit, segment, time, starttime ) {
		super(segment, time, starttime )
		this.previoussplit = previoussplit
	}

	get segmenttime() {
		return this.segment.average
	}
	get time() {
		let previoustime = this.previoussplit ? this.previoussplit.time : new Duration(0)
		return this.segmenttime.add( previoustime )
	}
}

export class SegmentArray extends BaseArray {
	constructor( segments ) {
		if ( segments instanceof Array ) {
			super()
			segments.forEach((v) => {
				this.push(v)
			})
		} else {
			super( segments )
		}
	}
	find( originalname ) {
		return this.filter( ( segment, index ) => {
			return segment.originalname === originalname
		} )[0]
	}
}

export class SplitArray extends BaseArray {
	constructor( segments ) {
		if ( segments instanceof SegmentArray ) {
			super()
			segments.forEach( (v) => {
				this.push( new Split( v ) )
			})
		} else {
			super( segments )
		}
	}
	findBySegment( segment ) {
		// This should match
		if ( this[segment.id]?.segment === segment ) {
			return this[segment.id]
		}
		// else go fish
		return this.filter( ( split, index ) => {
			return split?.segment === segment
		} )[0]
	}
	previousSplitTime( split ) {
		return this[ this.indexOf( split ) -1 ].time
	}
	isValidUpTo( split ) {
		for ( let a = 0; a <= this.indexOf( split ); a++ ) {
			if ( !this[a].time ) {
				return false
			}
		}
		return true
	}
}

export class AverageSplitArray extends SplitArray {
	constructor( segments ) {
		if ( segments instanceof SegmentArray ) {
			super()
			let prev
			segments.forEach( (v) => {
				prev = new AverageSplit( prev, v )
				this.push( prev )
			})
		} else {
			super( segments )
		}
	}
}

export class Attempt {
	id // id of attempt
	splits // array of splits
	completed = false // did this attempt complete
	pb = false // did this attempt PB? need to know previous PBs for this to work
	pbimprovement // duration of time over previous pb
	started // what date/time did this attempt start
	ended // what date/time did this attempt end
	#time
	arbitrary
	diedat
	lastpb
	lastcompletedrun
	#totalsplitduration
	constructor( id, time ) {
		this.id = id
		if ( time ) {
			this.time = new Duration( time )
		}
		this.arbitrary = isNaN(this.id)
		if ( this.id == "average" ) {
			return
		}
		if ( this.defaultsegments instanceof SegmentArray ) {
			this.splits = new SplitArray( this.defaultsegments )
		}
		this.diedat = this.splits[0].segment
		this.#totalsplitduration = undefined
	}
	get time() {
		return this.#time
	}
	set time(v) {
		this.#time = v
	}

	updateSegmentSplit( segment, splittime, splitstarttime ) {
		let split = this.splits.findBySegment( segment )
		if ( !splittime && !splitstarttime ) {
			return
		}
		if ( splittime ) {
			split.time = new Duration( splittime )
		}
		if ( !splitstarttime )  {
			// maybe we can work it out?
			if ( segment.id == 0 ) {
				// easy
				split.segmenttime = split.time
			} else {
				splitstarttime = this.splits.previousSplitTime( split ) // [this.splits.indexOf(split) -1].time
			}
		}
		if ( splitstarttime ) {
			split.segmenttime = split.time.sub( splitstarttime )
		}
		this.verifySplit( split )
		this.#totalsplitduration = undefined
	}

	updateSegmentTime( segment, segmenttime ) {
		if ( !segmenttime ) {
			return
		}
		let split = this.splits.findBySegment( segment )
		split.segmenttime = new Duration( segmenttime )

		if ( split === this.splits.first() ) {
			split.time = split.segmenttime
		} else {
			var prevTime = this.splits.previous( split ).time
			if ( prevTime ) {
				split.time = split.segmenttime.add( prevTime )
			}
		}

		this.verifySplit( split )



		//this.updateSegmentSplit( segment, segmenttime.add ( this.totalsplitduration || new Duration (0) ) )
	}

	verifySplit( split ) {
		if ( this.arbitrary ) {
			return
		}
		split.segment.completions++
		if ( split.segmenttime ) {
			split.segment.totaltime = split.segment.totaltime.add( split.segmenttime )
		}
		this.diedat = this.splits[this.splits.indexOf(split) + 1]?.segment
		if ( split.time && ( !split.segment.bestpace.time || split.time.lt( split.segment.bestpace.time ) ) && this.splits.isValidUpTo( split ) ) {
			split.segment.bestpace.time = split.time
			split.segment.bestpace.attempt = this
		}
		if ( this.splits.last() === split ) {
			// final split
			this.diedat = undefined
			this.completed = true
			if ( !split.time && this.time ) {
				// can we backfill times working our way back from the end?
				split.time = this.time
				let prevSplit = split
				let curSplit
				while ( curSplit = this.splits.previous( prevSplit ) ) {
					if ( curSplit.time || !curSplit.segmenttime ) {
						break
					}
					curSplit.time = prevSplit.time.sub( curSplit.segmenttime )
					prevSplit = curSplit
				}
			}
		}
	}

	get totalsplitduration() {
		if ( !this.#totalsplitduration ) {
			this.#totalsplitduration = this.splits.reduce( (a, s) => {
				if ( s?.segmenttime instanceof Duration ) {
					return s.segmenttime.add(a)
				}
				return a
			}, 0 )
		}
		return this.#totalsplitduration
	}
	get runduration() {
		return this.time || this.splits.last().time
	}

}

export class AverageAttempt extends Attempt {
	constructor(  ) {
		super("average")

		if ( this.defaultsegments instanceof SegmentArray ) {
			this.splits = new AverageSplitArray( this.defaultsegments )
		}
	}
	get time() {
		return this.splits.last().time
	}
}

export class AttemptCollection extends BaseArray {
	// e.g. collection of PBs/Completed Runs etc

}

export class AttemptComparison {
	id
	attempt1
	attempt2
	constructor( attempt1, attempt2 ) {
		if ( ! attempt2 ) {
			attempt2 = attempt1
		}
		this.id= "comp_" + attempt1.id + "_" + attempt2.id
		this.attempt1 = attempt1
		this.attempt2 = attempt2
	}

	diff( segment ) {
		if ( segment instanceof Segment ) {
			let split1 = this.attempt1.splits.findBySegment( segment )
			let split2 = this.attempt2.splits.findBySegment( segment )
			if ( split1.segmenttime && split2.segmenttime ) {
				return split1.segmenttime.sub( split2.segmenttime )
			}
			return new Duration(0)

		}
		return this.attempt1.runduration.sub( this.attempt2.runduration )
	}
	maxdiff() {
		return this.attempt1.splits.reduce( (acc, split) => {
			return this.diff(split.segment).max(acc)
		}, 0)
	}
	mindiff() {
		return this.attempt1.splits.reduce( (acc, split) => {
			return this.diff(split.segment).min(acc)
		}, 0)
	}
	diffaspercentofmax( segment ) {
		return ((this.diff( segment )/this.maxdiff())*100).toFixed(2)
	}
	diffaspercentofmin( segment ) {
		return ((this.diff( segment )/this.mindiff())*100).toFixed(2)
	}
}