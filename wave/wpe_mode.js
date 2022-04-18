
if (window.wallpaperRegisterAudioListener) {
    window.wallpaperRegisterAudioListener(function (data) {
        putVisData(data);
        isWPE = true;
		update_i++;
		update_i = update_i % 1024;
        document.getElementById("demo_mode").style.visibility = "hidden";
    });
}