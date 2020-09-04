import Duration from './duration.js'
export default class SplitsFile {
	lssDoc
	game
	category
	attemptcount
	gameicon
	#splits
	#attempts
	constructor( lss ) {
		var parser = new DOMParser()
		this.lssDoc = parser.parseFromString(lss ,"text/xml")
		this.game = this.lssDoc.getElementsByTagName("GameName")[0].textContent
		this.category = this.lssDoc.getElementsByTagName("CategoryName")[0].textContent
		this.attemptcount = this.lssDoc.getElementsByTagName("AttemptCount")[0].textContent

		this.gameicon = this.#getImgFromIcon( this.lssDoc.getElementsByTagName("GameIcon")[0].textContent )
		this.splits
		this.attempts
	}

	#getImgFromIcon( icondata ) {
		var bindata = atob( icondata )
		if ( bindata.length ) {
			var img = bindata.substr(bindata.indexOf('PNG') -1)
			var imag = new Image()
			imag.src = "data:image/png;base64," + btoa(img)
			imag.alt = this.game
			return imag
		}
		return null
	}
	#formatDate( lssdate ) {
		let [mon,day,year,hour,minute,second] = lssdate.split(/[\/: ]/)
		return (year + "-" + mon + "-" + day + " " + hour + ":" + minute)
	}

	get splits() {
		if ( this.#splits ) {
			return this.#splits
		}
		var totalsofar = {
			'realtime': new Duration(0),
			'gametime': new Duration(0)
		}
		this.#splits =  Array.from(this.lssDoc.querySelectorAll("Segment")).map( (a, index) => {
			var splittimes = {}

			Array.from(a.querySelectorAll("SplitTime")).forEach( b => {
				splittimes[b.getAttribute("name")] = {
					'realtime': b.querySelector("RealTime") ? new Duration(b.querySelector("RealTime").textContent) : false,
					'gametime':  b.querySelector("GameTime") ? new Duration(b.querySelector("GameTime").textContent) : false
				}
			})
			var allsplits = Array.from(a.querySelectorAll('SegmentHistory Time')).map( c => {
				return {
					'attempt': c.getAttribute('id'),
					'realtime':  c.querySelector("RealTime") ? new Duration(c.querySelector("RealTime").textContent) : false,
					'gametime': c.querySelector("GameTime") ? new Duration( c.querySelector("GameTime").textContent) : false
				}
			})
			var average = allsplits.reduce( (acc, split) => {
				['realtime', 'gametime'].forEach( time => {
					if ( split[time] ) {
						acc[time].count++
						acc[time].total = acc[time].total.add(split[time])
					}
				} )
				return acc

			}, {
				'realtime': {
					count: 0,
					total: new Duration(0)
				},
				'gametime': {
					count: 0,
					total: new Duration(0)
				}
			} )

			for ( const time of ['realtime', 'gametime'] ) {
				average[time].average = average[time].total.avg( average[time].count)
			}
			var pbsegment = {
				'realtime': splittimes["Personal Best"].realtime ? splittimes["Personal Best"].realtime.sub( totalsofar.realtime ) : false,
				'gametime': splittimes["Personal Best"].gametime ? splittimes["Personal Best"].gametime.sub( totalsofar.gametime ) : false

			}
			totalsofar = splittimes["Personal Best"]
			return {
				"name": a.querySelector("Name").textContent,
				"pb": splittimes["Personal Best"],
				"pbsegment": pbsegment,
				"splittimes": splittimes,
				"resets": 0,
				"icon": this.#getImgFromIcon( a.querySelector("Icon").textContent ),
				"gold": {
					'realtime': a.querySelector("BestSegmentTime RealTime") ? new Duration(a.querySelector("BestSegmentTime RealTime").textContent) : false,
					'gametime': a.querySelector("BestSegmentTime GameTime") ? new Duration(a.querySelector("BestSegmentTime GameTime").textContent) : false
				},
				"bestpace": {
					'realtime': false,
					'gametime': false,
					'attemptid': 0
				},
				"average": average,
				"allsplits": allsplits
			}
		})
		return this.#splits
	}

	get attempts() {
		if ( this.#attempts ) {
			return this.#attempts
		}
		console.log("thinking")
		var lastpb = {
			'realtime': null,
			'gametime': null
		}

		this.#attempts = Array.from(this.lssDoc.querySelectorAll("AttemptHistory Attempt")).map( (a, index) => {
			var id = a.getAttribute('id')
			var realtime = a.querySelector("RealTime") ? new Duration(a.querySelector("RealTime").textContent ) : null
			var gametime = a.querySelector("GameTime") ? new Duration(a.querySelector("GameTime").textContent ) : null

			var wasrtpb = false
			var wasgtpb = false
			var rtpbimprovement = false
			var gtpbimprovement = false
			if ( realtime ) {
				if ( !lastpb.realtime || realtime.lt( lastpb.realtime ) ) {
					if ( lastpb.realtime ) {
						rtpbimprovement = realtime.sub(lastpb.realtime)
					}
					lastpb.realtime = realtime
					wasrtpb = true

				}
			}
			if ( gametime ) {
				if ( !lastpb.gametime || gametime.lt( lastpb.gametime ) ) {
					if ( lastpb.gametime ) {
						gtpbimprovement = gametime.sub(lastpb.gametime)
					}
					lastpb.gametime = gametime
					wasgtpb = true

				}
			}
			var completed = !!(gametime || realtime)
			var diedat = null
			var diedatindex = null


			var alltimes = Array.from(this.lssDoc.querySelectorAll("SegmentHistory Time[id='" + id +"']"))
			var attemptduration = {
				realtime: new Duration(0),
				gametime: new Duration(0)
			}
			var previoussegment = -1;
			alltimes.some( (time) => {
				var segment = time.parentNode.parentNode
				var segmentindex = Array.from(segment.parentNode.children).indexOf(segment)
				// check for continuity of splits, if we don't have it then we can't reliably calculate Best Pace
				if ( segmentindex != previoussegment +1 ) {
					attemptduration = {
						realtime: false,
						gametime: false
					}
					return true;
				}
				previoussegment = segmentindex
				if ( time.querySelector("RealTime")?.textContent ) {
					attemptduration.realtime = attemptduration.realtime.add( time.querySelector("RealTime").textContent )
					if ( !this.splits[segmentindex].bestpace.realtime || attemptduration.realtime.lt( this.splits[segmentindex].bestpace.realtime )  ) {
						this.splits[segmentindex].bestpace.realtime = attemptduration.realtime
						this.splits[segmentindex].bestpace.attemptid = id
					}
				}
				if ( time.querySelector("GameTime")?.textContent ) {
					attemptduration.gametime = attemptduration.gametime.add( time.querySelector("GameTime").textContent )
					if ( !this.splits[segmentindex].bestpace.gametime || attemptduration.gametime.lt( this.splits[segmentindex].bestpace.gametime ) ) {
						this.splits[segmentindex].bestpace.gametime = attemptduration.gametime
					}
				}
			})
			if ( !completed ) {
				var indexofSplit = 0
				if ( alltimes.length ) {
					var segment = alltimes[alltimes.length - 1].parentNode.parentNode
					indexofSplit = Array.from(segment.parentNode.children).indexOf(segment) + 1

				}
				diedat = this.splits[indexofSplit].name
				this.splits[indexofSplit].resets++
				diedatindex = indexofSplit
			}


			return {
				id: id,
				started: this.#formatDate(a.getAttribute('started')),
				ended: this.#formatDate(a.getAttribute('ended')),
				realtime: realtime,
				gametime: gametime,
				rtpbimprovement: rtpbimprovement,
				gtpbimprovement: gtpbimprovement,
				wasrtpb: wasrtpb,
				wasgtpb: wasgtpb,
				completed: completed,
				diedat: diedat,
				diedatindex: diedatindex
			}
		})
		return this.#attempts
	}
}
