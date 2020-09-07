export default class Duration {
	hours = 0
	minutes = 0
	seconds = 0
	totalseconds = 0
	milliseconds = 0
	totalmilliseconds = 0
	negative = false
	constructor( time ) {
		if ( isNaN(time) ) {
			if ( !time.length ) {
				time = 0
			} else {
				var matching = time.match(/\d{2}:\d{2}:\d{2}(\.\d{3})?/)
				if ( !matching ) {
					time = 0
				} else {
					let [hours, minutes, seconds, milliseconds] = matching[0].split(/[:\.]/)
					milliseconds = milliseconds || 0
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
	plainformat() {
		return this.getFormattedHour() + ':' + this.getFormattedMinute() + ':' + this.getFormattedSecond() + '.' + this.getFormattedMS()
	}
	plainshortformat() {
		return (this.hours > 0 ? this.getFormattedHour() + ':' : '') + this.getFormattedMinute() + ':' + this.getFormattedSecond()
	}
	format( gold ) {
		var extra =""
		var full = this.plainformat()
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

	formatcomparison(min, max) {
		var ret = this.format()
		var percentdiff = 0
		if ( this.negative ) {
			if ( min ) {
				percentdiff = (this.totalmilliseconds/min.totalmilliseconds)*100
			}
			return `<span class="green">-${ret}</span>`
		}
		if ( this.totalmilliseconds == 0 ) {
			return `<span>${ret}</span>`
		}
		return `<span class="red">+${ret}</span>`
	}
	humanformat() {
		let ret = ""
		if ( this.hours > 0 ) {
			ret += this.hours + 'h '
		}
		if ( this.minutes > 0 || this.hours > 0 ) {
			ret += this.minutes + 'm '
		}

		if ( this.seconds > 0 || ret.length > 0 ) {
			ret += this.seconds + 's '
		}


		ret += this.milliseconds + 'ms'
		return ret;
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
	max ( other ) {
		other = this.#verify( other )
		if ( this.totalmilliseconds >= other.totalmilliseconds ) {
			return this
		}
		return other
	}
	min ( other ) {
		other = this.#verify( other )
		if ( this.totalmilliseconds <= other.totalmilliseconds ) {
			return this
		}
		return other
	}
	toString() {
		return this.plainformat()
	}

}