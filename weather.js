const dayNames = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jum'at",
    "Sabtu",
];

const compareDates = (d1, d2) => {
    let date1 = new Date(d1).getTime();
    let date2 = new Date(d2).getTime();

    if (date1 < date2) {
        return "Less";
    } else if (date1 > date2) {
        return "Greater";
    } else if (date1 <= date2) {
        return "Less Or Equal";
    } else if (date1 >= date2) {
        return "Greater Or Equal";
    } else {
        return "Equal";
    }
};

function filterWeatherByCurrentDatetime(weatherData) {
    // Dapatkan waktu sekarang dalam format yang sesuai (YYYY-MM-DDTHH:00:00)
    const currentDateTime = new Date();
    currentDateTime.setHours(currentDateTime.getHours() + 7);
    const formattedCurrentDateTime = currentDateTime
        .toISOString()
        .slice(0, 16)
        .replace("T", " "); // Ambil YYYY-MM-DDTHH

    // Gabungkan data cuaca dari array cuaca
    const allWeatherData = weatherData.flat();

    // Filter data cuaca yang sesuai dengan local_datetime hari ini dan jam ini
    const filteredData = allWeatherData.filter((weather) => {
        const weatherDateTime = weather.local_datetime.slice(0, 16); // Ambil YYYY-MM-DDTHH
        return (
            compareDates(weatherDateTime, formattedCurrentDateTime) === "Less"
        );
    });

    return filteredData;
}

function minMaxTemp(weatherData) {
    const temps = filterWeatherByCurrentDatetime(weatherData).map(
        (value) => value.t
    );

    return {
        min: Math.min(...temps),
        max: Math.max(...temps),
    };
}

const bmkgWether = async ({
    eTemp,
    eHumid,
    eWindSpeed,
    eMaxT,
    eMinT,
    eWeatherName,
    eWeatherIcon,
    eTime,
    eDay,
    eRegionName,
    eSource,
    regionCode = "32.01.06.2011",
    regionName = null,
}) => {
    // jongol 32.01.06.2011

    const res = await fetch(
        `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${regionCode}`,
        {
            method: "GET",
        }
    );

    if (!res.ok) {
        return false;
    }

    const now = new Date();

    const str = await res.json();
    const data = str.data[0].cuaca;
    const filteredData = filterWeatherByCurrentDatetime(data);
    const parameters = filteredData[filteredData.length - 1];
    const minMaxT = minMaxTemp(data);

    const humidities = parameters.hu;
    const temperatures = parameters.t;
    const maxTs = minMaxT.max;
    const minTs = minMaxT.min;
    const windSpeeds = parameters.ws;
    const weathers = parameters.weather_desc;

    eTime.textContent = now.getHours() + ":" + now.getMinutes();
    eDay.textContent = dayNames[now.getDay()];

    eSource.textContent = "BMKG"
    eHumid.textContent = humidities;
    eTemp.textContent = temperatures;
    eWindSpeed.textContent = windSpeeds;
    eWeatherName.textContent = weathers;
    eMaxT.textContent = maxTs;
    eMinT.textContent = minTs;
    eWeatherIcon.innerHTML = `<img src="${parameters.image}" class="w-24 mx-auto"></img>`;
    eRegionName.textContent = regionName;
};

const awsWether = async (
    // apiUrl,
    // appKey,
    // apiKey,
    // macKey,
    awsDeviceId,
    {
        eTemp,
        eHumid,
        eWindSpeed,
        eMaxT,
        eMinT,
        eWeatherName,
        eWeatherIcon,
        eTime,
        eDay,
        eSource,
    }
) => {
    const now = new Date();

    eTime.textContent = now.getHours() + ":" + now.getMinutes();
    eDay.textContent = dayNames[now.getDay()];

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const formatStartDate = `${year}-${month}-${day} 00:00:00`;
    const formatEndDate = `${year}-${month}-${day} 23:59:59`;

    try {
        // Ganti URL sesuai endpoint kamu
        // const res = await fetch(`/api/aws/weather?device_id=${awsDeviceId}`);
        const res = await fetch(
            `https://api.ecowitt.net/api/v3/device/history?application_key=41C80E3871C5A8944483B11B28BD33C3&api_key=9027ce60-f3a2-457a-b02b-012fc91b676e&mac=C4:5B:BE:FA:0C:7F&start_date=${formatStartDate}&end_date=${formatEndDate}&call_back=outdoor.temperature,outdoor.dew_point,outdoor.humidity,rainfall.rain_rate,wind.wind_speed,wind.wind_direction&temp_unitid=1&wind_speed_unitid=7`
        );
        const json = await res.json();

        const tempList = json.data?.outdoor?.temperature?.list ?? {};
        const humidList = json.data?.outdoor?.humidity?.list ?? {};
        const windList = json.data?.wind?.wind_speed?.list ?? {};

        const timestamps = Object.keys(tempList)
            .map((ts) => Number(ts))
            .sort((a, b) => b - a); // descending
        if (!timestamps.length) throw new Error("No data");

        const latestTs = timestamps[0];

        const temp = parseFloat(tempList[latestTs]);
        const humid = parseFloat(humidList[latestTs]);
        const windSpeed = parseFloat(windList[latestTs]);

        const tempValues = Object.values(tempList).map((v) => parseFloat(v));
        const maxT = Math.max(...tempValues);
        const minT = Math.min(...tempValues);

        eTemp.textContent = `${temp.toFixed(0)}`;
        eHumid.textContent = `${humid.toFixed(0)}`;

        eMaxT.textContent = `${maxT.toFixed(0)}`;
        eMinT.textContent = `${minT.toFixed(0)}`;

        eSource.textContent = "AWS"
        eWindSpeed.textContent = `${windSpeed}`;
        eWeatherName.textContent = "Cerah"; // Dummy, bisa hitung dari suhu/humid
        eWeatherIcon.innerHTML = `<i class="fa-solid fa-sun"></i>`; // Dummy, ganti sesuai kondisi cuaca
    } catch (error) {
        console.error("Gagal mengambil data AWS: ", error);
        eHumid.textContent = "-";
        eTemp.textContent = "-";

        eMaxT.textContent = "-";
        eMinT.textContent = "-";

        eWindSpeed.textContent = "-";
        eWeatherName.textContent = "-";
        eWeatherIcon.innerHTML = `<i class="fa-solid fa-moon"></i>`;
    }
};

const weatherNames = (code) => {
    switch (code) {
        case 0:
            return ["Cerah", "sun"];
            break;
        case 1:
            return ["Cerah Berawan", "cloud-sun"];
            break;
        case 2:
            return ["Cerah Berawan", "cloud-sun"];
            break;
        case 3:
            return ["Berawan", "cloud"];
            break;
        case 4:
            return ["Berawan Tebal", "cloud"];
            break;
        case 5:
            return ["Udara Kabur", "smog"];
            break;
        case 10:
            return ["Asap", "smog"];
            break;
        case 45:
            return ["Kabut", "smog"];
            break;
        case 60:
            return ["Hujan Ringan", "cloud-rain"];
            break;
        case 61:
            return ["Hujan Sedang", "cloud-showers-heavy"];
            break;
        case 63:
            return ["Hujan Lebat", "cloud-showers-heavy"];
            break;
        case 80:
            return ["Hujan Lokal", "cloud-showers-heavy"];
            break;
        case 95:
            return ["Hujan Petir", "cloud-bolt"];
            break;
        case 97:
            return ["Hujan Petir", "cloud-bolt"];
            break;

        default:
            return ["", ""];
            break;
    }
};

const weatherHtml = () => {
    const now = new Date();
    return `<div class="inline-block overflow-hidden text-left align-bottom transition-all transform bg-gradient-to-br from-blue-600 to-blue-900 rounded-lg shadow-xl sm:align-middle sm:max-w-2xl sm:w-full" role="dialog" aria-modal="true" aria-labelledby="modal-headline" id="wether-modal">
        <div class="p-3 flex flex-row gap-2 text-white">
            <div>
                <div>
                    <div class="text-xs md:text-lg font-extrabold lato-regular" id="bmkg-day">${
                        dayNames[now.getDay()]
                    }</div>
                    <div class="text-xs md:text-6xl lato-regular mt-2 relative"><span class="font-extrabold" id="bmkg-temp">-</span><span class="absolute md:-top-4">°</span></div>
                </div>
                <div class="text-xs font-semibold text-slate-50/50">Last Updated <span id="bmkg-times">${now.getHours()}:${now.getMinutes()}</span></div>
                <div><i class="fa-solid fa-location-dot"></i>&nbsp;<span class="text-xs" id="bmkg-region-name">-</span></div>
            </div>
            <div class="grid grid-cols-1 content-between">
                <div>
                    <div class="text-xs md:text-base"><i class="fa-solid fa-wind"></i>&nbsp;<span id="bmkg-ws">-</span> km/h</div>
                    <div class="text-xs md:text-base"><i class="fa-solid fa-droplet"></i>&nbsp;<span id="bmkg-humid">-</span>%</div>
                </div>
                <div>
                    <div>H&nbsp;<span id="bmkg-max-t">-</span>°C</div>
                    <div>L&nbsp;<span id="bmkg-min-t">-</span>°C</div>
                </div>
            </div>
            <div class="text-center">
                <div class="text-2xl md:text-8xl" id="bmkg-weather-icon"><i class="fa-solid fa-moon"></i></div>
                <div class="text-lg text-slate-50/50" id="bmkg-weather-name">Clear</div>
            </div>
        </div>
        <div class="text-xs md:text-base p-3 text-white">
        Sumber: <span id="source">-</span>
        </div>
    </div>`;
};
