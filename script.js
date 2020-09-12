import SplitsFile from './splitsfile.js'

import {  AttemptComparison } from './splitclasses.js'
import Duration from './duration.js';

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

				lss.segments.forEach( (seg, index) => {
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
								<a href="" class="viewsegment" data-segmentindex="${index}">${seg.name}</a>
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
								<a href="" class="viewattempt" data-attemptid="${seg.bestpace.attempt.id}">${seg.bestpace.attempt.id}</a>
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
						<a href="" class="viewattempt" data-attemptid="${attempt.id}">${attempt.id}</a>
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

				document.querySelector(".tabs").addEventListener("click", (e) => {

					if ( e.target.classList.contains('viewattempt') ) {
						let attempt = lss.allattempts.find( e.target.dataset.attemptid )
						let wrapper = document.querySelector(".modalviewerwrapper")
						if ( attempt ) {
							wrapper.classList.remove('hidden')
							wrapper.querySelector('.modaltitle').textContent = "Attempt #" + attempt.id

							let splithtml = ''
							attempt.splits.forEach( (s) => {
								splithtml += `
								<tr>
									<td>${s.segment.name}</td>
									<td>${s.time?.format() || '-'}</td>
									<td>${attempt.lastpb?.splits.findBySegment(s.segment).time?.format() || '-' }</td>
									<td>${pbattempt.splits.findBySegment(s.segment).time?.format() || '-' }</td>
								</tr>
								`
							} )
							wrapper.querySelector('.modalcontent').innerHTML = `
								<table class="table">
									<tr>
										<th>Split</th>
										<th>Time</th>
										<th>PB then</th>
										<th>PB now</th>
									</tr>
									${splithtml}
								</table>
							`
						}

						e.preventDefault()
					} else if ( e.target.classList.contains('attemptstab') ) {
						var data = {
							labels: lss.allattempts.map((a) => {
								return a.id
							}),
							series: [
								lss.allattempts.map((a) => {
									return a.runduration?.totalmilliseconds
								}),
								lss.allattempts.map((a) => {
									return a.pb ? a.runduration.totalmilliseconds : null
								})
							]
						};
						var options = {
							lineSmooth: Chartist.Interpolation.cardinal({
								fillHoles: true,
							}),

							axisX: {
								labelInterpolationFnc: function(value, index) {
									return index % Math.round(lss.allattempts.length/12) === 0 ? value : null;
								}
							},
							axisY: {
								scaleMinSpace: 20,
								labelInterpolationFnc: function(value) {
									return new Duration(value).plainshortformat()
								}
							},
							chartPadding: 30,
							plugins: [
								Chartist.plugins.ctAxisTitle({
									axisX: {
										axisTitle: "Attempt #",
										axisClass: "ct-axis-title",
										offset: {
											x: 0,
											y: 50
										},
										textAnchor: "middle"
									},
									axisY: {
										axisTitle: "Time",
										axisClass: "ct-axis-title",
										offset: {
											x: 0,
											y: 0
										},
										flipTitle: false
									}
								})
							]
						}
						new Chartist.Line('#rundurationchart', data, options);
					} else if ( e.target.classList.contains('viewsegment') ) {
						let segment = lss.segments[ e.target.dataset.segmentindex ]
						let wrapper = document.querySelector(".modalviewerwrapper")
						if ( segment ) {
							wrapper.classList.remove('hidden')
							wrapper.querySelector('.modaltitle').textContent = segment.name
							wrapper.querySelector('.modalcontent').innerHTML = `
							<div id="segmentchart" class="ct-chart ct-perfect-fourth"></div>
							`


							var data = {
								labels: lss.allattempts.map((a) => {
									return a.id
								}),
								series: [
									lss.allattempts.map((a) => {
										return a.splits.findBySegment(segment)?.segmenttime?.totalmilliseconds
									})
								]
							};
							var options = {
								lineSmooth: Chartist.Interpolation.cardinal({
									fillHoles: true,
								}),
								low: Math.max(lss.allattempts.reduce((acc, a) => {
									return acc.min(a.splits.findBySegment(segment)?.segmenttime || acc )
								}, new Duration (1000*60*60*24)).sub(new Duration(1000*30)),0),
								high: Math.max(
									lss.allattempts.reduce((acc, a) => {
										return acc.max(a.splits.findBySegment(segment)?.segmenttime || acc )
									}, new Duration (0)).add(new Duration(1000*30)),0),
								axisX: {
									labelInterpolationFnc: function(value, index) {
										return index % Math.round(lss.allattempts.length/12) === 0 ? value : null;
									}
								},
								axisY: {
									scaleMinSpace: 20,
									labelInterpolationFnc: function(value) {
										return new Duration(value).plainshortformat()
									}
								},
								chartPadding: 30,
								plugins: [
									Chartist.plugins.ctAxisTitle({
										axisX: {
											axisTitle: "Attempt #",
											axisClass: "ct-axis-title",
											offset: {
												x: 0,
												y: 50
											},
											textAnchor: "middle"
										},
										axisY: {
											axisTitle: "Time",
											axisClass: "ct-axis-title",
											offset: {
												x: 0,
												y: 0
											},
											flipTitle: false
										}
									})
								]
							}
							new Chartist.Line('#segmentchart', data, options);

						}

						e.preventDefault()
					}
					e.stopPropagation()
				}, false)


			})
		}, 100)
		document.querySelector('.modalcloser').addEventListener('click', () => {
			document.querySelector('.modalviewerwrapper').classList.add('hidden')
		})
	}
	reader.readAsText(file)
	console.log(file)
}

