/*General node script for logging events daily. Customize with the lines preceding http.createServer, including client-side form file.*/
const http=require('http'),fs=require('fs'),qs=require('querystring');
tableOpenTag='<table>'
//The "data model" should map from the form defined in append_form.html, to tableHeader, and to returnTableRowString in the next few lines.
appendFormFilename='.\\addForm.html'//'.\\html-to-Client\\addForm.html'//File defining form to serve to browser, should match tableHeader and returnTableRow below
tableHeader='<tr><th>Job Title<th>Organization<th>Person<th>Contact Info<th>Description<th>Link'//https://www.w3.org/TR/html401/struct/tables.html
function returnTableRowString(post,milliseconds) {//e.g. use as returnTableRowString(post,Date.now())
	return `<tr><td>${post.title}<td>${post.organization}<td>${post.person}<td>${post.phone}<td>${post.description}<td><a href=${post.link}>${post.link}</a></table>`}
//End of Data model definition.

const link_to_style_file='<link rel=stylesheet type=text/css href=style.css>'//https://stackoverflow.com/q/4957446/895065, https://www.dummies.com/web-design-development/html5-and-css3/how-to-use-an-external-style-sheet-for-html5-and-css3-programming/
const html_header_string='<!DOCTYPE html><html><head>'+link_to_style_file+'</head>'
var html_footer_string='</html>'
const table_close_tag='</table>'
var storage_directory='./work_search_logs_by_day/'
let port=1025

http.createServer(createServerListener).listen(port)
function createServerListener(request,response) {//request is a readable stream (http.IncomingMessage), response is a writable stream (http.ServerResponse).
	request.on('error', (error) => {console.log(`request error: ${error}`)})//log request error events if any (don't crash), was console.log(request.headers)
	if (request.method=='GET') {
		console.log(request.url)
		if (request.url=='/style.css'){getCSS(response)}
		else {GETDayLogs(request,response,appendFormFilename,html_header_string,html_footer_string)}
	}
	if (request.method=='POST') {POSTToTodaysLog(request,response,tableOpenTag,tableHeader,returnTableRowString)}
}

function getCSS(response) {//get css file to style the document
	styleRS=fs.createReadStream('.\\style.css')
	styleRS.on('error',(error)=>{console.log('css error: '+error)})//How to respond if error reading css? 404?
	styleRS.on('open',()=>{console.log('css open')
		response.writeHead(200,{'Content-Type': 'text/css'})})//https://stackoverflow.com/a/28838314/895065 Andy Zarzycki
	styleRS.on('data',(data)=>{
		console.log('css data available')
		response.write(data)})
	styleRS.on('end',()=>{console.log('css end')
		response.end()})
}

function GETDayLogs(request,response,appendFormFilename,html_header_string,html_footer_string){//GET, i.e. page load, serve the form to fill, and any already posted data today
		todaysDate=todaysDateString()//Return today's date formatted as the name of the file...can this be up one level in scope?
		todaysHeader=todaysDateHeader()//Return today's date formatted as a header to serve to client.
		response.write(html_header_string)
		todaysFile=storage_directory+todaysDate+'.html'
		let checked_today=false;
		response.write('<h3>'+todaysHeader+'</h3>')
		appendFormRS=fs.createReadStream(appendFormFilename)//Append form and input elements for each posting.
		appendFormRS.on('data',(data)=>response.write(data))//Write the form and input html to the client.
		appendFormRS.on('end',()=>{//After form is completely sent to client,
				fs.readdir(storage_directory,(error,files)=>{
					console.log(files)
				        if (files) {files.reverse()//Or use Array.pop() and Array.length in createReadFileStreamRespondRecurse function definition
						createReadFileStreamRespondRecurseEnd(files,storage_directory,response,html_footer_string,checked_today,todaysDate+'.html')}
				})
		})	
	}

function createReadFileStreamRespondRecurseEnd(filenames_array,storage_directory,response,html_footer_string,checked_today,todaysFile){//from serverScripts\listJobPostings\YYYYMMDD-branch\onscroll-tests\read_files_server_nextdate-onscroll.js
	let fileRS=fs.createReadStream(storage_directory+filenames_array[0])
		fileRS.on('error',(error)=>{console.log(error)})
		fileRS.on('open',()=>{
			if (!checked_today) {if (todaysFile==filenames_array[0]){console.log('already file for today, don\'t rewrite date header')
										checked_today=true}//
								else {console.log('no file for today yet, so write date header for first file')
									response.write('<h3>'+convertDateFilenameToDateHeader(filenames_array[0])+'</h3>')
									checked_today=true}}//Don't write the date header for today's table, date should be there above form already
			else{response.write('<h3>'+convertDateFilenameToDateHeader(filenames_array[0])+'</h3>')}
		})
		fileRS.on('data',(data)=>{response.write(data)})
		fileRS.on('end',()=>{
			if (filenames_array.length==1){response.end(html_footer_string)}//https://stackoverflow.com/a/17136825/895065
			else {
				filenames_array.shift()
				createReadFileStreamRespondRecurseEnd(filenames_array,storage_directory,response,html_footer_string,checked_today,todaysFile)
			}
		})
}

function POSTToTodaysLog(request,response,tableOpenTag,tableHeader,returnTableRowString){//If the request is a POST, append new info to today's .html file.
		todaysDate=todaysDateString()//Get today's date, the name of the current file. Can this be up one level in scope?
		todaysFile=storage_directory+todaysDate+'.html'
		request.on('error',(error)=>{console.log('request.on error'+error.stack)})
		let body=''//Load POST data into string. REF: https://stackoverflow.com/a/4310087/895065
		request.on('data', (data) => {
			body+=data;
			if (body.length>1e6) {request.connection.destroy();}
		})
		request.on('end', () => {//At POST end, append to today's file (create if doesn't exist), then redirect to GET
			var post=qs.parse(body)//Parse the POST 'query' string. REFS: https://stackoverflow.com/a/4310087/895065, https://nodejs.org/api/querystring.html	
			//Try to open today's file to write to, but it may not yet be created.
			todaysFileRS=fs.createReadStream(todaysFile,{flags:'r+'});//,highWaterMark:1});//Try to read the file,  //https://stackoverflow.com/a/41320130/895065
			todaysFileRS.on('error',(error)=>{console.log('todaysFileRS Error: '+error)//If file does not exist yet,
				console.log('create new file for today')//
				todaysFileWS=fs.createWriteStream(todaysFile,{flags:'a+'})//attempt to create it.
				todaysFileWS.on('error',(error)=>{console.log('todaysFileWS Error, no directory: '+error)//If no expected storage directory, log error,
					response.end(html_header_string+'<script>alert(\'post not recorded, check if storage directory exists\')</script>'+html_footer_string)//tell user post failed.
					//response.writeHead(303,{"Location":"http://"+request.headers['host']})//Redirect to GET request.
					//return response.end()//why is there a 'return' here? wouldn't response.end() suffice?
				})
				todaysFileWS.on('ready',()=>{
					console.log(`created new file, ${todaysFile}`)//If today's table is created,
					todaysFileWS.write(tableOpenTag)//write the table open tag,
					todaysFileWS.write(tableHeader)//the table header,
					todaysFileWS.write(returnTableRowString(post,Date.now()))//and the new row.
					todaysFileWS.end()
				})
				todaysFileWS.on('finish',()=>{
						response.writeHead(303,{"Location":"http://"+request.headers['host']})//Redirect to GET request.
						return response.end()
					})
			})//https://stackoverflow.com/a/17136825/895065
			var table_close_index=0
			var s='';
			var readable_count=0
			todaysFileRS.on('readable',function () {//console.log('readable!')//https://nodejs.org/api/stream.html#stream_event_readable
				fs.stat(todaysFile,(error,stats)=>{//Find size of today's file and so which byte to write new row over </table> tag.
						if (error) {console.log('fs.stat error: '+error)}
						console.log('stats.size: '+stats.size)//console.log('stats: '+JSON.stringify(stats))//console.log('table_close_tag.length: '+table_close_tag.length)//console.log(`expected table close tag position: ${stats.size-table_close_tag.length}`)
						table_close_index=stats.size-table_close_tag.length
						todaysFileWS=fs.createWriteStream(todaysFile,{flags:'r+',start:table_close_index})
						console.log('writing new row starting at byte '+table_close_index)
						if (table_close_index>0) {todaysFileWS.write(returnTableRowString(post,Date.now()))}//append the new row
						response.writeHead(303,{"Location":"http://"+request.headers['host']})//Redirect to GET request
						return response.end()
				})
			})			
			response.on('error',(error) => console.log(`response error: ${error.stack}`))
		})
	}

console.log('listening on: '+port)
//get today's date to name the file if it doesn't not exist already
function todaysDateString() {//ex. 2018-08-03
	let today=new Date()
	YYYY=today.getFullYear()//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
	MM=today.getMonth()+1
	if (MM.toString().length < 2) MM='0'+MM.toString()
	DD=today.getDate()
	if (DD.toString().length < 2) DD='0'+DD.toString()
	YYYYMMDD=YYYY+'-'+MM+'-'+DD
	return YYYYMMDD
}

function todaysDateHeader() {//ex. 8-30-2018
	let today=new Date()
	return (today.getMonth()+1)+'-'+today.getDate()+'-'+today.getFullYear()
}

function dateHeader(date) {//ex. 8-30-2018
	return (date.getMonth()+1)+'-'+date.getDate()+'-'+date.getFullYear()
}

function convertDateFilenameToDateHeader(date_string){//ex. convert 2018-08-03 to 08-03-2018. Also, consider alternative calendars!
	if (['01','02','03','04','05','06','07','08','09'].indexOf(date_string.split('-')[1])>-1) {
		var month=date_string.split('-')[1].slice(1,2)
	} else {var month=date_string.split('-')[1]}
	if (['01','02','03','04','05','06','07','08','09'].indexOf(date_string.split('-')[2].split('.')[0])>-1)	 {
		var day=date_string.split('-')[2].split('.')[0].slice(1,2)
	} else {var day=date_string.split('-')[2].split('.')[0]}
	return month+'-'+day+'-'+date_string.split('-')[0]
}

function returnCurrentHourMinutesAMPM() {//return current time formatted as 'H:MM AM/PM'
	var date_string=(Date())
	var time_string=date_string.split(' ')[4]
	var minutes_string=time_string.split(':')[1]
	var hours_string=time_string.split(':')[0]
	if (hours_string>12) {
	  var meridiem='PM'
	  var hours_12=hours_string-12
	  }
	else {
	  var meridiem='AM'
	  var hours_12=hours_string
	  }
	return hours_12+':'+minutes_string+' '+meridiem
}

function returnHourMinutesMillisecondsAMPM(ms_since_1970) {//format milliseconds since 1970 as 'H:MM.ms AM/PM', call w/Date.now()
	var milliseconds=ms_since_1970.toString()
	milliseconds = milliseconds.slice(milliseconds.length-3,milliseconds.length)//https://www.w3schools.com/jsref/jsref_slice_string.asp
	var date_string=Date(ms_since_1970)
	var time_string=date_string.split(' ')[4]
	var minutes_string=time_string.split(':')[1]
	var hours_string=time_string.split(':')[0]
	if (hours_string>12) {
	  var meridiem='PM'
	  var hours_12=hours_string-12
	  }
	else {
	  var meridiem='AM'
	  var hours_12=hours_string
	  }
	return hours_12+':'+minutes_string+'.'+milliseconds+' '+meridiem
}
