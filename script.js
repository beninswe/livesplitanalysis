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

			document.querySelector("#splits tbody").insertAdjacentHTML('beforeend',`
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
						${goldvspb.formatcomparison()}
					</td>
					<td>
						${avgtotal.format()}
					</td>
					<td>
						${avgtime.format()}
					</td>

					<td >
						${avgvspb.formatcomparison()}
					</td>
					<td class="gold-l">
						${seg.resets}
					</td>
					<td>
						${seg.bestpace.realtime.format()} in #${seg.bestpace.attemptid}
					</td>

				</tr>

			`)
		})
		var pbcounter = 0
		var completedruncounter = 0
		lss.attempts.filter( (seg) => {

			let attempthtml = `
			<tr class="attempt ${(seg.wasgtpb || seg.wasrtpb)? 'pbrun ' + ( (pbcounter++ %2 == 0 ) ? 'pbeven' : 'pbodd') : ''} ${(seg.completed)? 'completed ' + ( (completedruncounter++ %2 == 0 ) ? 'completedeven' : 'completedodd') : ''}">
				<td class="rightalign">
					${seg.id}
				</td>
				<td>${seg.started}</td>
			`

			if ( seg.completed ) {
				attempthtml += `
				<td class="rightalign">${seg.completed ? seg.realtime.format() : ''}</td>
				<td class="rightalign">${(seg.wasgtpb || seg.wasrtpb) ? (seg.rtpbimprovement ? seg.rtpbimprovement.formatcomparison() : new Duration(0).formatcomparison()) : ''}</td>`
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

