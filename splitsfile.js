import Duration from './duration.js?v005'

import { Icon, SplitGroup, Segment, Split, Attempt, AttemptCollection, SegmentArray, AverageAttempt, AttemptComparison } from './splitclasses.js?v005'
export default class SplitsFile {
	lssDoc
	game
	category
	attemptcount
	gameicon
	timingmethod
	segments = []
	subsplitgroups = []
	pb
	sob
	comparisons = new AttemptCollection()
	allattempts = new AttemptCollection()
	allcompletions = new AttemptCollection()
	allpbs = new AttemptCollection()
	average
	pbvsgold
	constructor( lss, timingmethod, finishedcallback ) {
		var parser = new DOMParser()
		this.lssDoc = parser.parseFromString( lss ,"text/xml" )
		this.game = this.lssDoc.getElementsByTagName( "GameName" )[0].textContent
		this.category = this.lssDoc.getElementsByTagName( "CategoryName" )[0].textContent
		this.attemptcount = parseInt(this.lssDoc.getElementsByTagName( "AttemptCount" )[0].textContent, 10)

		this.gameicon = new Icon( this.lssDoc.getElementsByTagName( "GameIcon" )[0].textContent ).image
		this.timingmethod = timingmethod

		if ( this.timingmethod == 'auto' ) {
			// if last completed run has a gametime assume gametime is used else realtime
			if ( this.lssDoc.querySelector( "Segment:last-child SegmentHistory Time:last-child GameTime" ) ) {
				this.timingmethod = 'GameTime'
			} else {
				this.timingmethod = 'RealTime'
			}

		}
		this._processSegmentsInfo()
		this._processAttempts()

		this.average = new AverageAttempt()

		this.pbvsgold = new AttemptComparison( this.pb, this.sob )
		this.pbvsavg = new AttemptComparison( this.pb, this.average )
		finishedcallback(this )
	}

	_processSegmentsInfo() {
		let currentsubsplitstart = 0
		let currentSegment = { completions: this.attemptcount }
		Attempt.prototype.defaultsegments = this.segments = new SegmentArray(
			[ ...this.lssDoc.querySelectorAll( "Segment" ) ].map( ( seg, index ) => {
				let nameOfSegment = seg.querySelector( "Name" ).textContent
				let icon = seg.querySelector( "Icon" ).textContent
				if ( nameOfSegment.substr( 0, 1 ) == '{' ) {
					let nameOfSubsplit = nameOfSegment.substring( 1, nameOfSegment.indexOf( '}' ) )
					let subsplitgroup = new SplitGroup( nameOfSubsplit, currentsubsplitstart, index + 1, this.segments )
					currentsubsplitstart = index + 1
					this.subsplitgroups.push( subsplitgroup )
				}
				return currentSegment = new Segment( index, nameOfSegment, icon, currentSegment )
			})
		)

		let sobcounter = new Duration(0)

		this.pb = new Attempt( "PB" )
		this.sob = new Attempt( "SoB" )

		this.segments.forEach( ( segment, index ) => {
			let seg = this.lssDoc.querySelectorAll( "Segment" )[index]
			;[ ...seg.querySelectorAll( "SplitTime" ) ].forEach( ( comparison ) => {
				let splitname = comparison.getAttribute('name')
				let splittime = comparison.querySelector( this.timingmethod )?.textContent
				if ( splitname == 'Personal Best') {
					this.pb.updateSegmentSplit( segment, splittime )
				} else {
					let othercomp = this.comparisons.find( splitname )
					if ( !othercomp ) {
						othercomp = new Attempt( splitname )
						this.comparisons.push( othercomp )
					}
					othercomp.updateSegmentSplit( segment, splittime )
				}
			} )

			let sobsegment = seg.querySelector( "BestSegmentTime " + this.timingmethod ).textContent
			let sobsplittime = sobcounter.add( sobsegment )
			this.sob.updateSegmentSplit( segment, sobsplittime, sobcounter )
			segment.gold = this.sob.splits.findBySegment( segment )
			sobcounter = sobsplittime
		} )

	}

	_processAttempts() {
		let domAttempts = [ ...this.lssDoc.querySelectorAll( "AttemptHistory Attempt" ) ]
		domAttempts.forEach( ( att ) => {
			let attemptid = att.getAttribute( 'id' )
			let attempttime = att.querySelector( this.timingmethod )?.textContent
			let thisAttempt = new Attempt( attemptid, attempttime )
			thisAttempt.lastpb = this.allpbs.last()
			thisAttempt.lastcompletedrun = this.allcompletions.last()
			this.allattempts.push( thisAttempt )
			thisAttempt.started = this._formatDate( att.getAttribute( 'started' ) )
			thisAttempt.ended = this._formatDate( att.getAttribute( 'ended' ) )
			;[ ...this.lssDoc.querySelectorAll( "SegmentHistory Time[id='" + attemptid +"']" ) ].forEach( ( time ) => {
				let segmenttime = time.querySelector( this.timingmethod )?.textContent
				if ( !segmenttime ) {
					return
				}
				let segmentxml = time.parentNode.parentNode
				let segmentname = segmentxml.querySelector( "Name" ).textContent

				let segmentindex = Array.from( segmentxml.parentNode.children ).indexOf( segmentxml )

				let segment = this.segments[ segmentindex ]
				if ( !segment.originalname == segmentname ) {
					segment = this.segments.find( segmentname )
				}
				thisAttempt.updateSegmentTime( segment, segmenttime )

			})
			if ( !thisAttempt.completed ) {
				thisAttempt.diedat.rundeaths++
			} else {
				if ( thisAttempt.runduration.gte( thisAttempt.totalsplitduration )) {
					this.allcompletions.push( thisAttempt )
					if ( !this.allpbs.last() || this.allpbs.last().runduration.gt( thisAttempt.runduration ) ) {
						thisAttempt.pb = true
						this.allpbs.push( thisAttempt )
					}
				} else {
					thisAttempt.diedat = { name: 'Unknown - Nonsensical splits?' }
					thisAttempt.completed = false
				}
			}
		} )
	}

	_formatDate( lssdate ) {
		if ( !lssdate ) {
			return "Unknown"
		}
		let [mon,day,year,hour,minute,second] = lssdate.split(/[\/: ]/)
		return (year + "-" + mon + "-" + day + " " + hour + ":" + minute)
	}
}
