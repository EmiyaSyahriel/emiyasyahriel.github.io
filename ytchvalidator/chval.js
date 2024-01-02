(() => {

/**
YouTube video prerequisites:
- Starts at 00:00
- At least have 3 chapters
- All in ascending order (earlier time = first)
- Chapter must be 10 second long
**/

const time_regex = /([0-9]{0,}:[0-9]{1,2}:[0-9]{1,2})|([0-9]{1,2}:[0-9]{1,2})/g;

const ERR_TYPE_NON = 0x000;
const ERR_TYPE_ERR = 0xBAD;
const ERR_TYPE_WRN = 0xEEE;

const add_view_item = (name, time, duration, err_type, reason) => {
/**
<div class="ch_item_container">
	<div class="ch_item_thumb"></div>
	<span class="ch_item_title">Chapter Name</span>
	<span class="ch_item_time">00:00</span>
	<span class="ch_item_error">Something is wrong</span>
</div>
**/
	let container = document.createElement("div");
	container.classList.add("ch_item_container");
	
	let thumb = document.createElement("div");
	
	let tx_name = document.createElement("span");
	let tx_time = document.createElement("span");
	let tx_errs = document.createElement("span");
	
	tx_name.textContent = name;
	tx_time.textContent = `${time} (${duration}s)`;
	tx_errs.textContent = reason;
	
	thumb.classList.add("ch_item_thumb");
	tx_name.classList.add("ch_item_title");
	tx_time.classList.add("ch_item_time");
	tx_errs.classList.add("ch_item_error");
	
	container.appendChild(thumb);
	container.appendChild(tx_name);
	container.appendChild(tx_time);
	
	switch(err_type){
		case ERR_TYPE_ERR:
		container.classList.add("ch_error");
		break;
		case ERR_TYPE_WRN:
		container.classList.add("ch_warning");
		break;
	}
	
	container.appendChild(tx_errs);
	document.querySelector("#result_ccontainer").appendChild(container);
}

const has_time = (line) => {
	let b = line.match(time_regex);
	return b != null && b.length == 1;
}

const get_line_time = (line) => {
	let b = line.match(time_regex);
	if(b == null || b.length == 0) return null;
	return b[0];
}

const time_to_sec = (time_str) => {
	const parts = time_str.split(":");
	var total = 0;
	
	if(parts < 2) return 0;
	
	let mul = 1;
	for(let i = parts.length - 1; i >= 0; i--){
		let s = parseInt(parts[i])
		// More than or equal to 60 in minutes and seconds
		if(mul <= 61 && s >= 60){
			throw new Error("Time format error - Time range");
		}
		
		let e = s * mul;
		mul *= 60;
		
		// Skip NaN
		if(isNaN(e)) {
			throw new Error("Time format error - NaN");
		}
		total += e;
	}
	
	return total;
}

const parse = () => {
	// Do DOM cleaning
	document.querySelector("#result_ccontainer").innerHTML = "";
	let total_time = 0;
	
	try {
		total_time = time_to_sec(document.querySelector("#source_total_duration").value);
		if(total_time == 0){
			throw new Error("Total time is empty or zero");
		}
	}catch(e){
		window.alert(e);
		return;
	}
	
	let count = 0;
	let chaps = [];
	
	const lines = document.querySelector("#source_textarea").value.replace("\r","").split("\n");
	for(var line of lines){
		if(!has_time(line)){
			count = 0;
			chaps.splice(0, chaps.length);
			continue;
		}
		
		let l_time = get_line_time(line.trim()).trim();
		let c_name = line.trim();
		let l_name = line.replace(l_time, "").trim();
		try {
			let o_time = time_to_sec(l_time);
			chaps.push({name: l_name, fname: c_name, ttime: l_time, ntime: o_time, dur: 0, err: ERR_TYPE_NON, reason: "Fine"});
		}catch(e){
			let f_time = 10;
			if(chaps.length > 0){
				f_time = chaps[chaps.length - 1].ntime + 11;
			}
			chaps.push({name: l_name, fname: c_name, ttime: l_time, ntime: f_time, dur: 0, err: ERR_TYPE_ERR, reason: e.message});
		}
	}
	
	// Calculate chapter duration
	for(let i = 0; i < chaps.length; i++){
		let t = i + 1 >= chaps.length ? total_time : chaps[i + 1].ntime;
		chaps[i].dur = t - chaps[i].ntime;
	}
	
	/// Validation part
	
	// None, just skip
	if(chaps.length == 0) return;
	
	
	// Check must greater than 10s
	for(let chap of chaps){
		if(chap.dur < 10 && chap.err == ERR_TYPE_NON){
			chap.err = ERR_TYPE_ERR;
			chap.reason = "Chapter less than 10 seconds";
		}
	}
	
	for(let chap of chaps){
		if(chap.ntime > total_time && chap.err == ERR_TYPE_NON){
			chap.err = ERR_TYPE_ERR;
			chap.reason = "Chapter not in the video duration";
		}
	}
	
	
	// Check must ascending
	for(let i = 1; i < chaps.length; i++){
		let pchap = chaps[i-1];
		let nchap = chaps[i];
		if(pchap.ntime > nchap.ntime && chap.err == ERR_TYPE_NON){
			nchap.err = ERR_TYPE_ERR;
			nchap.reason = "Chapter is not properly ordered";
		}
	}
	
	// Warning if name longer than 100 char
	for(let chap of chaps){
		if(chap.name.length > 100 && chap.err == ERR_TYPE_NON){
			chap.err = ERR_TYPE_WRN;
			chap.reason = "Chapter name longer than 100 characters";
		}
	}
	
	// Warning if time not at start or end
	for(let chap of chaps){
		if(!(chap.fname.startsWith(chap.ttime) || chap.fname.endsWith(chap.ttime))){
			chap.err = ERR_TYPE_WRN;
			chap.reason = "Time notation is not at start or end of line";
		}
	}
	
	// Check first must start at 00:00
	if(chaps[0].ntime !== 0){
		chaps[0].err = ERR_TYPE_ERR;
		chaps[0].reason = "First chapter not start at zero";
	}
	
	// Check for more than 3 chapter
	if(chaps.length <= 3){
		chaps[chaps.length-1].err = ERR_TYPE_ERR;
		chaps[chaps.length-1].reason = "Only found less than 3 valid chapters";
	}
	
	// Rendering part
	
	for(let chap of chaps){
		add_view_item(chap.name, chap.ttime, chap.dur, chap.err, chap.reason);
	}
	
	display_chapters(true);
}

const display_chapters = (on_chap) => {
	var src = document.querySelector("#source_container");
	var dst = document.querySelector("#result_main");
	
	if(on_chap){
		src.classList.add("tab_hidden");
		dst.classList.remove("tab_hidden");
	}else{
		dst.classList.add("tab_hidden");
		src.classList.remove("tab_hidden");
	}
}

document.querySelector("#source_parse_btn").addEventListener("click", (e) => parse());
document.querySelector("#tab_chapter_close").addEventListener("click", (e) => display_chapters(false));

const switch_dark_mode = (active) => {
	if(active){
		document.body.classList.add("dark_mode")
	}else{
		document.body.classList.remove("dark_mode")
	}
}

// Check for dark mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    switch_dark_mode(event.matches);
});

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    switch_dark_mode(true);
}

})();