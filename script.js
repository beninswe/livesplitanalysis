class Duration {
	hours = 0
	minutes = 0
	seconds = 0
	totalseconds = 0
	milliseconds = 0
	totalmilliseconds = 0
	negative = false
	constructor( time ) {
		if ( isNaN(time) ) {
			var matching = time.match(/\d{2}:\d{2}:\d{2}\.\d{3}/)
			if ( !matching ) {
				time = 0
			} else {
				let [hours, minutes, seconds, milliseconds] = matching[0].split(/[:\.]/)
				time = parseInt(milliseconds, 10) +
					(
						(
							( parseInt(hours, 10) * 3600 ) +
							( parseInt(minutes, 10) * 60 ) +
							parseInt(seconds, 10)
						) * 1000
					)
			}
		}
		this.totalmilliseconds = time
		let remainder = this.totalmilliseconds
		if ( this.totalmilliseconds < 0 ) {
			this.negative = true
			remainder *= -1
		}
		[this.hours, this.minutes, this.seconds, this.milliseconds] = [3600000, 60000, 1000, 1].map( (a) => {
			if ( remainder >= a ) {
				var res = Math.floor( remainder / a )
				remainder -= ( res * a )
				return res
			}
			return 0
		})
	}
	format( gold ) {
		var extra =""
		var full = this.getFormattedHour() + ':' + this.getFormattedMinute() + ':' + this.getFormattedSecond() + '.' + this.getFormattedMS()
		var ret = this.getFormattedMinute() + ':' + this.getFormattedSecond()
		if ( this.hours > 0 ) {
			ret = this.getFormattedHour() + ':' + ret
		}
		if ( gold ) {
			gold = this.#verify( gold )
			if ( this.eq( gold ) ) {
				extra = `class="gold"`
			}
		}
		return `<abbr title="${full}" ${extra}>${ret}</abbr>`
	}

	formatcomparison() {
		var ret = this.format()
		if ( this.negative ) {
			return `<span class="green">-${ret}</span>`
		}
		if ( this.totalmilliseconds == 0 ) {
			return `<span>${ret}</span>`
		}
		return `<span class="red">+${ret}</span>`
	}

	getFormattedHour() {
		return (""+this.hours).padStart(2, "0")
	}
	getFormattedMinute() {
		return (""+this.minutes).padStart(2, "0")
	}
	getFormattedSecond() {
		return (""+this.seconds).padStart(2, "0")
	}
	getFormattedMS() {
		return (""+this.milliseconds).padStart(3, "0")
	}
	asMilliseconds() {
		return this.totalmilliseconds
	}
	#verify( other ) {
		if ( !(other instanceof Duration) ) {
			return new Duration(other)
		}
		return other
	}
	sub( other ) {
		other = this.#verify( other )
		return new Duration( this.totalmilliseconds - other.totalmilliseconds )
	}
	add( other ) {
		other = this.#verify( other )
		return new Duration( this.totalmilliseconds + other.totalmilliseconds )
	}
	avg ( count ) {
		return new Duration( Math.round(this.totalmilliseconds / count ) )
	}

	gt ( other ) {
		other = this.#verify( other )
		return this.totalmilliseconds > other.totalmilliseconds
	}
	gte ( other ) {
		other = this.#verify( other )
		return this.totalmilliseconds >= other.totalmilliseconds
	}
	lt ( other ) {
		other = this.#verify( other )
		return this.totalmilliseconds < other.totalmilliseconds
	}
	lte ( other ) {
		other = this.#verify( other )
		return this.totalmilliseconds <= other.totalmilliseconds
	}
	eq ( other ) {
		other = this.#verify( other )
		return this.totalmilliseconds == other.totalmilliseconds
	}

}

class SplitsFile {
	lssDoc

	constructor( lss ) {
		var parser = new DOMParser()
		this.lssDoc = parser.parseFromString(text,"text/xml")
		console.log(this.lssDoc.getElementsByTagName("GameName")[0].textContent)

	}

	get splits() {
		var totalsofar = {
			'realtime': new Duration(0),
			'gametime': new Duration(0)
		}
		return Array.from(this.lssDoc.querySelectorAll("Segment")).map( (a, index) => {
			var splittimes = {}

			Array.from(a.querySelectorAll("SplitTime")).forEach( b => {
				splittimes[b.getAttribute("name")] = {
					'realtime': new Duration(b.querySelector("RealTime").textContent),
					'gametime': new Duration(b.querySelector("GameTime").textContent)
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
				'realtime': splittimes["Personal Best"].realtime.sub( totalsofar.realtime ),
				'gametime': splittimes["Personal Best"].gametime.sub( totalsofar.gametime )

			}
			totalsofar = splittimes["Personal Best"]
			return {
				"name": a.querySelector("Name").textContent,
				"pb": splittimes["Personal Best"],
				"pbsegment": pbsegment,
				"splittimes": splittimes,
				"gold": {
					'realtime': new Duration(a.querySelector("BestSegmentTime RealTime").textContent),
					'gametime': new Duration(a.querySelector("BestSegmentTime GameTime").textContent)
				},
				"average": average,
				"allsplits": allsplits
			}
		})
	}

	get attempts() {

	}
}

let dropArea = document.getElementById('drop-area')
;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
	dropArea.addEventListener(eventName, preventDefaults, false)
})

function preventDefaults (e) {
	e.preventDefault()
	e.stopPropagation()
}

;['dragenter', 'dragover'].forEach(eventName => {
	dropArea.addEventListener(eventName, highlight, false)
})

;['dragleave', 'drop'].forEach(eventName => {
	dropArea.addEventListener(eventName, unhighlight, false)
})

function highlight(e) {
	dropArea.classList.add('highlight')
}

function unhighlight(e) {
	dropArea.classList.remove('highlight')
}
dropArea.addEventListener('drop', handleDrop, false)

function handleDrop(e) {
	let dt = e.dataTransfer
	let files = dt.files

	handleFiles(files)
}
function handleFiles(files) {
	([...files]).forEach(uploadFile)
}

function uploadFile(file) {
	var reader = new FileReader();
	reader.onload = (e) => {
		text = reader.result
		var lss = new SplitsFile(text)
		var prevsplit = new Duration(0)
		let goldtotal = new Duration(0)
		let avgtotal = new Duration(0)
		lss.splits.forEach( (seg) => {

			var avgtime = seg.average.realtime.average
			var cursplit = seg.pb.realtime
			var cursegment = seg.pbsegment.realtime
			var goldsplit = seg.gold.realtime
			var goldvspb = cursegment.sub(goldsplit)
			goldtotal = goldtotal.add(goldsplit)
			avgtotal = avgtotal.add(avgtime)
			var avgvspb = cursegment.sub(avgtime)

			document.getElementById("splits").insertAdjacentHTML('beforeend',`
				<tr>
					<td>
						${seg.name}
					</td>
					<td>
						${cursplit.format()}
					</td>
					<td>
						${cursegment.format( goldsplit )}
					</td>
					<td>
						${goldtotal.format()}
					</td>
					<td>
						${goldsplit.format()}
					</td>
					<td>
						${goldvspb.formatcomparison()}
					</td>
					<td>
						${avgtotal.format()}
					</td>
					<td>
						${avgtime.format()}
					</td>

					<td>
						${avgvspb.formatcomparison()}
					</td>

				</tr>

			`)
			prevsplit = cursplit
		})

	}
	reader.readAsText(file)
	console.log(file)
}

