import SplitsFile from './splitsfile.js'

import {  AttemptComparison } from './splitclasses.js'

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
	let progressbar = document.getElementById("progressbar")
	let statusbar = progressbar.querySelector('.status')
	progressbar.classList.remove('hidden')
	var reader = new FileReader();
	reader.onload = async (e) => {
		let text = reader.result


		let timingid = document.querySelector(".timingchooser :checked").id
		let timingmethod = "GameTime"
		switch( timingid ) {
			case "timingauto":
				timingmethod = 'auto'
				break
			case "timingrt":
				timingmethod = "RealTime"
				break;
		}

		window.setTimeout( () => {
			document.getElementById("drop-areaholder").classList.add('hide')
			window.setTimeout(() => document.getElementById("drop-areaholder").classList.add('hidden'), 1000)
			new SplitsFile(text, timingmethod, (lss) => {
				timingmethod = lss.timingmethod.toLowerCase()
				document.getElementById("gamename").textContent = lss.game
				document.getElementById("categoryname").textContent = lss.category
				if (lss.gameicon) {
					document.getElementById("gameicon").appendChild(lss.gameicon)
				}

				let pbattempt = lss.allpbs.last()
				let goldtotal = lss.sob.time

				let pbvscomp = {}
				lss.comparisons.forEach ( (comp) => {
					pbvscomp[comp.id] = new AttemptComparison( pbattempt, comp )

					document.querySelector("#bestpaceheader").insertAdjacentHTML('beforebegin', `
					<th colspan="2" class="gold-r">${comp.id}</th>
					`)
					document.querySelector("#bestpacesplitheader").insertAdjacentHTML('beforebegin', `
					<th>Segment</th>
					<th class="gold-r">Split</th>
					`)

				})

				lss.segments.forEach( (seg) => {
					let segaverage = lss.average.splits.findBySegment(seg)
					let seginpb = lss.pb.splits.findBySegment(seg)
					let seginsob = lss.sob.splits.findBySegment(seg)
					let avgtotal = segaverage.time
					let goldsplit = seginsob.time

					let goldvspb = lss.pbvsgold.diff( seg )
					let avgvspb = lss.pbvsavg.diff( seg )
					let splithtml = `
						<tr>
							<td class="splitname">
								${seg.icon.image ? seg.icon.image.outerHTML : '<i></i>'}
								${seg.name}
							</td>
							<td>
								${seg.rundeaths}
							</td>
							<td class="gold-r">
								${seg.successrate}
							</td>
							<td>
								${seginpb.segmenttime.format( seginsob.segmenttime )}
							</td>
							<td>
								${seginpb.time.format()}
							</td>
							<td class="gold-l">
								<div class="${ goldvspb.gt(0) ? 'timeloss' : '' }" style="--p: ${lss.pbvsgold.diffaspercentofmax( seg )}%">
									<span class="from">${seginsob.segmenttime.format()}</span>
									<span class="diff">${goldvspb.formatcomparison()}</span>
								</div>
							</td>
							<td>
								${goldsplit.format()}
							</td>
							<td class="gold-l">
								<div
									${ avgvspb.gt(0) ? 'class="timeloss" style="--p: ' + lss.pbvsavg.diffaspercentofmax( seg ) + '%"' : '' }
									${ avgvspb.lt(0) ? 'class="timegain" style="--p: ' + lss.pbvsavg.diffaspercentofmin( seg ) + '%"' : '' }
								>
									<span class="from">${segaverage.segmenttime.format()}</span>
									<span class="diff">${avgvspb.formatcomparison()}</span>
								</div>
							</td>
							<td>
								${avgtotal.format()}
							</td>
					`

					lss.comparisons.forEach( (comp) => {
						let compsplit = pbvscomp[comp.id].attempt2.splits.findBySegment( seg )
						var split = compsplit.time
						var segment = compsplit.segmenttime
						var compvspb = pbvscomp[comp.id].diff(seg)
						splithtml += `
							<td class="gold-l">
							<div
								${ compvspb.gt(0) ? 'class="timeloss" style="--p: ' + pbvscomp[comp.id].diffaspercentofmax() + '%"' : '' }
								${ compvspb.lt(0) ? 'class="timegain" style="--p: ' + pbvscomp[comp.id].diffaspercentofmin() + '%"' : '' }
							>
								<span class="from">${ segment?.format?.() }</span>
								<span class="diff">${compvspb.formatcomparison()}</span>
							</div>
						</td>
						<td>
							${ split?.format?.() }
						</td>
						`
					})

					splithtml += `
							<td class="gold-l">
								${seg.bestpace.time.format()}
							</td>
							<td>
								${seg.bestpace.attempt.id}
							</td>

						</tr>

					`
					document.querySelector("#splits tbody").insertAdjacentHTML('beforeend', splithtml)
				})

				document.querySelector( ".personalbest .info" ).innerHTML = lss.pb.runduration.format()
				document.querySelector(".sumofbest .info").innerHTML = lss.sob.runduration.format()
				document.querySelector(".pbvssob .info").innerHTML = lss.pbvsgold.diff().formatcomparison()
				document.querySelector(".attempts .info").textContent = lss.allpbs.length + ' / ' + lss.allcompletions.length + ' / ' + lss.attemptcount


				let bestpbimprovement = lss.allpbs.reduce( ( acc, pb ) => {
					let comp = new AttemptComparison(pb, pb.lastpb)
					return comp.diff().min(acc)
				}, 0)


				lss.allattempts.forEach( (attempt) => {

					let pbfound = lss.allpbs.indexOf(attempt)
					let completedfound = lss.allcompletions.indexOf(attempt)

					let attempthtml = `
					<tr class="attempt ${ pbfound >= 0 ? 'pbrun ' + ( (pbfound %2 == 0 ) ? 'pbeven' : 'pbodd')  : '' } ${completedfound >= 0 ? 'completed ' + ( (completedfound %2 == 0 ) ? 'completedeven' : 'completedodd') : ''}">
						<td class="rightalign">
							${attempt.id}
						</td>
						<td>${attempt.started}</td>
					`

					if ( attempt.completed && attempt.runduration ) {
						let pbcomparison
						if ( attempt.pb ) {
							pbcomparison = new AttemptComparison( attempt, attempt.lastpb )

						}
						attempthtml += `
						<td class="rightalign">${attempt.runduration.format()}</td>
						<td class="rightalign">
						<div ${ attempt.pb ? 'class="timegain" style="--p: ' + (pbcomparison.diff()/bestpbimprovement)*100 + '%">' + pbcomparison.diff().formatcomparison() +  '</div>' : '' }
						</td>`
					}	else {
						attempthtml += `
						<td class="leftalign" colspan="2">Reset at ${attempt.diedat.name}</td>
						`
					}

					attempthtml += `</tr>`
					document.querySelector("#attempthistory tbody").insertAdjacentHTML('beforeend', attempthtml)
				})

				let savingtotal = lss.pbvsgold.diff()
				document.querySelector("#prettycomparisons").insertAdjacentHTML('beforeend', `
					<div>
						<div class="bars">
						${ lss.pbvsgold.attempt1.splits.map( (split, index) => {
							let segmentdeaths = split.segment.rundeaths
							let timesave =  lss.pbvsgold.diff( split.segment )
							let pbtime = split.segmenttime
							return `
								<div style="--w: ${ ( pbtime / lss.pbvsgold.attempt1.runduration) *100 }%; --tsw: ${ ( timesave / savingtotal ) * 100}%; --rsw: ${ ( segmentdeaths / lss.allattempts.length ) * 100 }%; --rswo: ${ ( (index == 0 ? 0 : segmentdeaths ) / (lss.allattempts.length - lss.segments[0].rundeaths) ) *100 }%">
									<div class="goldbar" style="--gw: ${ ( lss.pbvsgold.attempt2.splits[index].segmenttime / pbtime ) *100 }%"></div>
									<span class="split">${ split.segment.shortName }</span>
									<span class="time">${ pbtime.plainshortformat() }</span>
									<span class="timesave">${timesave.humanformat() }</span>
									<span class="resets">${ segmentdeaths }
										<span class="resetpc">(${ ( ( segmentdeaths / lss.allattempts.length ) * 100).toFixed(2) }%)</span>
										<span class="resetpcex1">(${ (( (index == 0 ? 0 : segmentdeaths ) / (lss.allattempts.length - lss.segments[0].rundeaths) ) *100).toFixed(2) }%)</span>

									</span>
									<span class="pts"><abbr title="Potential time save">Can save</abbr>: ${timesave.humanformat()}</span>
								</div>
							`
						} ).join("") }
						</div>
					</div>
				`)

				document.getElementById("results").classList.remove('hidden')
			})
		}, 100)
	}
	reader.readAsText(file)
	console.log(file)
}

