import Duration from './duration.js'
import SplitsFile from './splitsfile.js'

let dropArea = document.getElementById('drop-area')
;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
	dropArea.addEventListener(eventName, (e) => {
		e.preventDefault()
		e.stopPropagation()
	}, false)
})

;['dragenter', 'dragover'].forEach(eventName => {
	dropArea.addEventListener(eventName, () => {
		dropArea.classList.add('highlight')
	}, false)
})

;['dragleave', 'drop'].forEach(eventName => {
	dropArea.addEventListener(eventName, () => {
		dropArea.classList.remove('highlight')
	}, false)
})

dropArea.addEventListener('drop', (e) => {
	let dt = e.dataTransfer
	let files = dt.files

	handleFiles(files)
}, false)

function handleFiles(files) {
	([...files]).forEach(uploadFile)
}
window.handleFiles = handleFiles

function uploadFile(file) {
	var reader = new FileReader();
	reader.onload = (e) => {
		let text = reader.result
		document.getElementById("drop-areaholder").classList.add('hide')
		window.setTimeout(() => document.getElementById("drop-areaholder").classList.add('hidden'), 1000)

		var lss = new SplitsFile(text)
		document.getElementById("gamename").textContent = lss.game
		document.getElementById("categoryname").textContent = lss.category
		if (lss.gameicon) {
			document.getElementById("gameicon").appendChild(lss.gameicon)
		}

		let timingid = document.querySelector(".timingchooser :checked").id
		let timingmethod = "gametime"
		switch( timingid ) {
			case "timingauto":
				if (  lss.splits[lss.splits.length-1].pb.gametime && lss.splits[lss.splits.length-1].pb.gametime.gt(0) ) {
					break
				}
				// falls through
			case "timingrt":
				timingmethod = "realtime"
				document.querySelector(".timing .info").textContent = "Real Time"
				break;
		}

		let pbattempt = lss.attempts[ [ ...lss.pbs[ timingmethod ] ].pop() -1 ]

		let goldtotal = new Duration(0)
		let avgtotal = new Duration(0)
		let maxdifftogold = lss.splits.reduce( (acc, seg) => {
			let thisgold = seg.pbsegment[timingmethod].sub(seg.gold[timingmethod])
			return thisgold.max(acc)
		}, 0 )

		let maxdifftoavg = lss.splits.reduce( (acc, seg) => {
			let thisavg = seg.pbsegment[timingmethod].sub(seg.average[timingmethod].average)
			return thisavg.max(acc)
		}, 0 )
		let mindifftoavg = lss.splits.reduce( (acc, seg) => {
			let thisavg = seg.pbsegment[timingmethod].sub(seg.average[timingmethod].average)
			return thisavg.min(acc)
		}, 0 )
		lss.splits.forEach( (seg) => {

			var avgtime = seg.average[timingmethod].average
			var cursplit = seg.pb[timingmethod]
			var cursegment = seg.pbsegment[timingmethod]
			var goldsplit = seg.gold[timingmethod]
			var goldvspb = cursegment.sub(goldsplit)
			goldtotal = goldtotal.add(goldsplit)
			avgtotal = avgtotal.add(avgtime)
			var avgvspb = cursegment.sub(avgtime)
			let splithtml = `
				<tr>
					<td class="splitname">
						${seg.icon ? seg.icon.outerHTML : '<i></i>'}
						${seg.name}
					</td>
					<td>
						${cursplit.format()}
					</td>
					<td>
						${cursegment.format( goldsplit )}
					</td>
					<td class="gold-l">
						${goldtotal.format()}
					</td>
					<td>
						${goldsplit.format()}
					</td>
					<td class="gold-r">
						${goldvspb.formatcomparison(new Duration(0), maxdifftogold)}
					</td>
					<td>
						${avgtotal.format()}
					</td>
					<td>
						${avgtime.format()}
					</td>

					<td >
						${avgvspb.formatcomparison(mindifftoavg, maxdifftoavg)}
					</td>
					<td class="gold-l">
						${seg.resets}
					</td>
					<td>
						${seg.bestpace[timingmethod].format()} in #${seg.bestpace.attemptid}
					</td>

				</tr>

			`
			document.querySelector("#splits tbody").insertAdjacentHTML('beforeend', splithtml)
		})

		document.querySelector( ".personalbest .info" ).innerHTML = pbattempt[timingmethod].format()
		document.querySelector(".sumofbest .info").innerHTML = goldtotal.format()
		document.querySelector(".pbvssob .info").innerHTML = pbattempt[timingmethod].sub(goldtotal).formatcomparison()
		document.querySelector(".attempts .info").textContent = lss.pbs[timingmethod].length + ' / ' + lss.completedruns[timingmethod].length + ' / ' + lss.attemptcount
		let bestpbimprovement = lss.attempts.filter( seg => (( timingmethod == "realtime" &&  seg.rtpbimprovement ) ||  (timingmethod == "gametime" && seg.gtpbimprovement) ) ).reduce( ( acc, seg ) => {
			if ( timingmethod == "realtime" ) {
				return seg.rtpbimprovement.min(acc)
			}
			return seg.gtpbimprovement.min(acc)
		}, 0)
		lss.attempts.filter( (seg) => {
			let pbfound = lss.pbs[timingmethod].indexOf(seg.id)
			let completedfound = lss.completedruns[timingmethod].indexOf(seg.id)

			let attempthtml = `
			<tr class="attempt ${ pbfound >= 0 ? 'pbrun ' + ( (pbfound %2 == 0 ) ? 'pbeven' : 'pbodd')  : '' } ${completedfound >= 0 ? 'completed ' + ( (completedfound %2 == 0 ) ? 'completedeven' : 'completedodd') : ''}">
				<td class="rightalign">
					${seg.id}
				</td>
				<td>${seg.started}</td>
			`

			if ( ( seg.completed.realtime || seg.completed.gametime ) && seg[timingmethod] ) {
				attempthtml += `
				<td class="rightalign">${seg[timingmethod].format()}</td>
				<td class="rightalign">${( seg.wasgtpb && seg.gtpbimprovement && timingmethod == "gametime" ) ? seg.gtpbimprovement.formatcomparison(bestpbimprovement, 0) : ( seg.wasrtpb && seg.rtpbimprovement && timingmethod == "realtime" ) ? seg.rtpbimprovement.formatcomparison(bestpbimprovement, 0) : ''}</td>`
			}	else {
				attempthtml += `
				<td class="leftalign" colspan="2">Reset at ${seg.diedat}</td>
				`
			}

			attempthtml += `</tr>`
			document.querySelector("#attempthistory tbody").insertAdjacentHTML('beforeend', attempthtml)
		})
		document.getElementById("results").classList.remove('hidden')
	}
	reader.readAsText(file)
	console.log(file)
}

