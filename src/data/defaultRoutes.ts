import { Route } from "../types";

export const defaultRoutes: Route[] = [
  {
    "route_id": "A-101",
    "route_name": "কালশী হতে কাঁচপুর ব্রীজ",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "কালশী", "cumulative_km": 0.0 },
      { "stop_name": "মিরপুর-১২", "cumulative_km": 2.2 },
      { "stop_name": "মিরপুর-১০", "cumulative_km": 4.7 },
      { "stop_name": "কাজীপাড়া", "cumulative_km": 6.1 },
      { "stop_name": "শেওড়াপাড়া", "cumulative_km": 6.8 },
      { "stop_name": "ফার্মগেট", "cumulative_km": 11.4 },
      { "stop_name": "শাহবাগ", "cumulative_km": 13.7 },
      { "stop_name": "পল্টন", "cumulative_km": 15.6 },
      { "stop_name": "গুলিস্তান", "cumulative_km": 16.6 },
      { "stop_name": "টিকাটুলি", "cumulative_km": 17.8 },
      { "stop_name": "সায়দাবাদ", "cumulative_km": 18.9 },
      { "stop_name": "যাত্রাবাড়ী", "cumulative_km": 19.9 },
      { "stop_name": "সাইনবোর্ড", "cumulative_km": 24.8 },
      { "stop_name": "কাঁচপুরব্রীজ", "cumulative_km": 28.8 }
    ]
  },
  {
    "route_id": "A-102",
    "route_name": "পল্লবী হতে সদরঘাট",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "পল্লবী (মিরপুর-১২)", "cumulative_km": 0.0 },
      { "stop_name": "মিরপুর-১১১/২", "cumulative_km": 0.8 },
      { "stop_name": "বৈকালী হোটেল", "cumulative_km": 0.9 },
      { "stop_name": "মিরপুর-১১", "cumulative_km": 1.4 },
      { "stop_name": "মিরপুর-১০", "cumulative_km": 2.3 },
      { "stop_name": "কাজীপাড়া", "cumulative_km": 3.7 },
      { "stop_name": "ফার্মগেট", "cumulative_km": 9.0 },
      { "stop_name": "প্রেসক্লাব", "cumulative_km": 13.2 },
      { "stop_name": "টিএন্ডটি", "cumulative_km": 14.7 },
      { "stop_name": "রায়সাহেব বাজার", "cumulative_km": 15.7 },
      { "stop_name": "ভিক্টোরিয়া পার্ক", "cumulative_km": 16.9 }
    ]
  },
  {
    "route_id": "A-105",
    "route_name": "দুয়ারীপাড়া হতে ঢাকেশ্বরী",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "দুয়ারীপাড়া", "cumulative_km": 0.0 },
      { "stop_name": "মিরপুর-১২", "cumulative_km": 0.9 },
      { "stop_name": "মিরপুর সাড়ে ১১", "cumulative_km": 1.3 },
      { "stop_name": "বৈকালী হোটেল", "cumulative_km": 1.8 },
      { "stop_name": "মিরপুর-১১", "cumulative_km": 2.3 },
      { "stop_name": "মিরপুর-১০", "cumulative_km": 3.2 },
      { "stop_name": "কাজীপাড়া", "cumulative_km": 4.6 },
      { "stop_name": "শেওড়াপাড়া", "cumulative_km": 5.3 },
      { "stop_name": "আগারগাঁও", "cumulative_km": 7.0 },
      { "stop_name": "ধানমন্ডি", "cumulative_km": 10.6 },
      { "stop_name": "শুক্রাবাদ", "cumulative_km": 11.1 },
      { "stop_name": "ঢাকেশ্বরী মন্দির", "cumulative_km": 15.1 }
    ]
  },
  {
    "route_id": "A-110",
    "route_name": "দুয়ারীপাড়া হতে ঢাকেশ্বরী",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "দুয়ারিপাড়া", "cumulative_km": 0.0 },
      { "stop_name": "প্রশিকা", "cumulative_km": 2.0 },
      { "stop_name": "মিরপুর থানা", "cumulative_km": 2.4 },
      { "stop_name": "মিরপুর-১", "cumulative_km": 3.7 },
      { "stop_name": "আনসারক্যাম্প", "cumulative_km": 4.6 },
      { "stop_name": "টেকনিক্যাল", "cumulative_km": 5.5 },
      { "stop_name": "আসাদগেট", "cumulative_km": 9.1 },
      { "stop_name": "সায়েন্সল্যাব", "cumulative_km": 11.8 },
      { "stop_name": "বুয়েট", "cumulative_km": 14.9 },
      { "stop_name": "গুলিস্তান", "cumulative_km": 16.7 }
    ]
  },
  {
    "route_id": "A-111",
    "route_name": "পল্লবী (সিরামিক) হতে দিলকুশা",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "পল্লবী (সিরামিক)", "cumulative_km": 0.0 },
      { "stop_name": "মিরপুর-১১/২", "cumulative_km": 0.7 },
      { "stop_name": "বৈকালী হোটেল", "cumulative_km": 1.1 },
      { "stop_name": "মিরপুর-১১", "cumulative_km": 1.5 },
      { "stop_name": "মিরপুর-১০", "cumulative_km": 2.6 },
      { "stop_name": "কাজীপাড়া", "cumulative_km": 3.7 },
      { "stop_name": "ফার্মগেট", "cumulative_km": 9.0 },
      { "stop_name": "পল্টন", "cumulative_km": 13.5 },
      { "stop_name": "স্টেডিয়াম", "cumulative_km": 13.8 },
      { "stop_name": "নটরড্যাম কলেজ", "cumulative_km": 17.0 }
    ]
  },
  {
    "route_id": "A-114",
    "route_name": "মিরপুর (চিড়িয়াখানা) হতে সায়েদাবাদ",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "চিড়িয়াখানা", "cumulative_km": 0.0 },
      { "stop_name": "মিরপুর-১", "cumulative_km": 1.8 },
      { "stop_name": "আনসারক্যাম্প", "cumulative_km": 2.7 },
      { "stop_name": "দারুসালাম", "cumulative_km": 3.8 },
      { "stop_name": "কল্যাণপুর", "cumulative_km": 5.0 },
      { "stop_name": "শ্যামলী", "cumulative_km": 5.4 },
      { "stop_name": "কলেজগেট", "cumulative_km": 6.3 },
      { "stop_name": "আসাদগেট", "cumulative_km": 7.2 },
      { "stop_name": "ফার্মগেট", "cumulative_km": 9.0 },
      { "stop_name": "কাওরানবাজার", "cumulative_km": 10.0 },
      { "stop_name": "শাহবাগ", "cumulative_km": 11.4 },
      { "stop_name": "প্রেসক্লাব", "cumulative_km": 13.1 },
      { "stop_name": "স্টেডিয়াম", "cumulative_km": 14.1 },
      { "stop_name": "ইত্তেফাক", "cumulative_km": 17.2 },
      { "stop_name": "সায়েদাবাদ", "cumulative_km": 18.3 }
    ]
  },
  {
    "route_id": "A-115",
    "route_name": "মিরপুর-১ হতে যাত্রাবাড়ী",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "মিরপুর-১", "cumulative_km": 0.0 },
      { "stop_name": "আনসার ক্যাম্প", "cumulative_km": 1.0 },
      { "stop_name": "টেকনিক্যাল", "cumulative_km": 2.2 },
      { "stop_name": "কল্যাণপুর", "cumulative_km": 3.2 },
      { "stop_name": "শ্যামলী", "cumulative_km": 3.9 },
      { "stop_name": "কলেজগেইট", "cumulative_km": 4.6 },
      { "stop_name": "শুক্রাবাদ", "cumulative_km": 6.8 },
      { "stop_name": "কলাবাগান", "cumulative_km": 7.4 },
      { "stop_name": "সায়েন্সল্যাব", "cumulative_km": 8.4 },
      { "stop_name": "কাটাবন", "cumulative_km": 9.3 },
      { "stop_name": "শাহবাগ", "cumulative_km": 9.7 },
      { "stop_name": "প্রেসক্লাব", "cumulative_km": 11.5 },
      { "stop_name": "গুলিস্তান মোড়", "cumulative_km": 12.5 },
      { "stop_name": "বাংলাদেশ ব্যাংক", "cumulative_km": 13.8 },
      { "stop_name": "যাত্রাবাড়ী", "cumulative_km": 17.6 }
    ]
  },
  {
    "route_id": "A-119",
    "route_name": "দুয়ারিপাড়া হতে ভিক্টোরিয়া পার্ক",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "দুয়ারিপাড়া", "cumulative_km": 0.0 },
      { "stop_name": "পল্লবী (মিরপুর-১২)", "cumulative_km": 1.4 },
      { "stop_name": "মিরপুর-১১১/২", "cumulative_km": 1.8 },
      { "stop_name": "বৈকালী হোটেল", "cumulative_km": 2.1 },
      { "stop_name": "মিরপুর-১১", "cumulative_km": 2.8 },
      { "stop_name": "মিরপুর-১০", "cumulative_km": 3.7 },
      { "stop_name": "কাজীপাড়া", "cumulative_km": 5.1 },
      { "stop_name": "ফার্মগেট", "cumulative_km": 10.4 },
      { "stop_name": "প্রেসক্লাব", "cumulative_km": 14.6 },
      { "stop_name": "টিএন্ডটি", "cumulative_km": 16.1 },
      { "stop_name": "রায়সাহেব বাজার", "cumulative_km": 18.1 },
      { "stop_name": "ভিক্টোরিয়া পার্ক", "cumulative_km": 18.3 }
    ]
  },
  {
    "route_id": "A-122",
    "route_name": "মিরপুর-১২ (ইসিবি চত্বর) হতে আজিমপুর",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "মিরপুর-১২", "cumulative_km": 0.0 },
      { "stop_name": "ইসিবি মোড়", "cumulative_km": 8.8 },
      { "stop_name": "মিরপুর-১০", "cumulative_km": 8.9 },
      { "stop_name": "কাজীপাড়া", "cumulative_km": 10.3 },
      { "stop_name": "শেওড়াপাড়া", "cumulative_km": 11.0 },
      { "stop_name": "আগারগাঁও", "cumulative_km": 12.7 },
      { "stop_name": "শিশুমেলা", "cumulative_km": 14.0 },
      { "stop_name": "কলেজগেট", "cumulative_km": 14.5 },
      { "stop_name": "মানিকমিয়া এভিনিউ", "cumulative_km": 15.9 },
      { "stop_name": "আজিমপুর", "cumulative_km": 22.0 }
    ]
  },
  {
    "route_id": "A-127",
    "route_name": "মিরপুর মাজার রোড হতে আজিমপুর",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "মিরপুর মাজার রোড", "cumulative_km": 0.0 },
      { "stop_name": "মিরপুর-১", "cumulative_km": 1.0 },
      { "stop_name": "শ্যামলী", "cumulative_km": 4.6 },
      { "stop_name": "আসাদগেট", "cumulative_km": 6.6 },
      { "stop_name": "রাসেল স্কয়ার", "cumulative_km": 8.6 },
      { "stop_name": "কলাবাগান", "cumulative_km": 9.0 },
      { "stop_name": "সায়েন্সল্যাব", "cumulative_km": 10.0 },
      { "stop_name": "নিউমার্কেট", "cumulative_km": 10.6 },
      { "stop_name": "নীলক্ষেত", "cumulative_km": 10.8 },
      { "stop_name": "আজিমপুর", "cumulative_km": 12.0 }
    ]
  },
  {
    "route_id": "A-129",
    "route_name": "মিরপুর-১৪ হতে খিলগাও তালতলা",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "মিরপুর (১৪)", "cumulative_km": 0.0 },
      { "stop_name": "মিরপুর (১০)", "cumulative_km": 2.1 },
      { "stop_name": "মিরপুর (১)", "cumulative_km": 3.6 },
      { "stop_name": "বাংলা কলেজ", "cumulative_km": 5.3 },
      { "stop_name": "শ্যামলী", "cumulative_km": 7.4 },
      { "stop_name": "আসাদগেট", "cumulative_km": 8.9 },
      { "stop_name": "শুক্রাবাদ", "cumulative_km": 9.4 },
      { "stop_name": "কলাবাগান", "cumulative_km": 10.1 },
      { "stop_name": "সাইন্সল্যাব", "cumulative_km": 11.9 },
      { "stop_name": "শাহবাগ", "cumulative_km": 13.1 },
      { "stop_name": "প্রেসক্লাব", "cumulative_km": 14.7 },
      { "stop_name": "শাপলা চত্বর", "cumulative_km": 17.1 },
      { "stop_name": "কমলাপুর", "cumulative_km": 18.1 },
      { "stop_name": "বাসাবো", "cumulative_km": 20.9 },
      { "stop_name": "খিলগাও রেলগেট", "cumulative_km": 23.3 },
      { "stop_name": "খিলগাও তালতলা", "cumulative_km": 25.7 }
    ]
  },
  {
    "route_id": "A-131",
    "route_name": "মিরপুর চিড়িয়াখানা হতে সদরঘাট",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "চিড়িয়াখানা", "cumulative_km": 0.0 },
      { "stop_name": "মিরপুর-১", "cumulative_km": 1.8 },
      { "stop_name": "দারুসসালাম", "cumulative_km": 3.8 },
      { "stop_name": "শ্যামলী", "cumulative_km": 5.4 },
      { "stop_name": "আসাদগেট", "cumulative_km": 7.2 },
      { "stop_name": "ফার্মগেট", "cumulative_km": 9.0 },
      { "stop_name": "প্রেসক্লাব", "cumulative_km": 12.6 },
      { "stop_name": "গুলিস্থান", "cumulative_km": 13.7 },
      { "stop_name": "ভিক্টোরিয়াপার্ক", "cumulative_km": 16.0 }
    ]
  },
  {
    "route_id": "A-132",
    "route_name": "বাইপাইল হতে কেরানীগঞ্জ (নতুন জেলখানা)",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "বাইপাইল", "cumulative_km": 0.0 },
      { "stop_name": "কামারপাড়া", "cumulative_km": 15.5 },
      { "stop_name": "আব্দুল্লাহপুর", "cumulative_km": 17.7 },
      { "stop_name": "আজমপুর", "cumulative_km": 18.4 },
      { "stop_name": "এয়ারপোর্ট", "cumulative_km": 20.7 },
      { "stop_name": "খিলক্ষেত", "cumulative_km": 23.5 },
      { "stop_name": "বিশ্বরোড", "cumulative_km": 24.4 },
      { "stop_name": "স্টাফরোড", "cumulative_km": 26.4 },
      { "stop_name": "কাকলি", "cumulative_km": 28.4 },
      { "stop_name": "মহাখালী", "cumulative_km": 30.2 },
      { "stop_name": "ফার্মগেট", "cumulative_km": 33.1 },
      { "stop_name": "শাহবাগ", "cumulative_km": 35.5 },
      { "stop_name": "প্রেসক্লাব", "cumulative_km": 37.3 },
      { "stop_name": "ফুলবাড়িয়া", "cumulative_km": 38.8 },
      { "stop_name": "বাবু বাজার ব্রীজ", "cumulative_km": 40.2 },
      { "stop_name": "কেরানীগঞ্জ", "cumulative_km": 47.5 }
    ]
  },
  {
    "route_id": "A-137",
    "route_name": "বালুঘাট হতে সায়েদাবাদ",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "সায়দাবাদ", "cumulative_km": 0.0 },
      { "stop_name": "বাংলাদেশ ব্যাংক", "cumulative_km": 2.3 },
      { "stop_name": "ইউবিএল", "cumulative_km": 3.4 },
      { "stop_name": "প্রেসক্লাব", "cumulative_km": 4.0 },
      { "stop_name": "শাহবাগ", "cumulative_km": 5.2 },
      { "stop_name": "ফার্মগেট", "cumulative_km": 7.5 },
      { "stop_name": "বালুঘাট", "cumulative_km": 14.6 }
    ]
  },
  {
    "route_id": "A-138",
    "route_name": "উত্তরা (রানীগঞ্জ) হতে সদরঘাট",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "উত্তরা (রাণীগঞ্জ)", "cumulative_km": 0.0 },
      { "stop_name": "নতুন বাজার", "cumulative_km": 11.8 },
      { "stop_name": "রামপুরা টিভি সেন্টার", "cumulative_km": 15.2 },
      { "stop_name": "মালিবাগ", "cumulative_km": 18.5 },
      { "stop_name": "কাকরাইল", "cumulative_km": 19.3 },
      { "stop_name": "বঙ্গবন্ধু এভিনিউ", "cumulative_km": 21.0 },
      { "stop_name": "ভিক্টোরিয়া পার্ক", "cumulative_km": 23.3 }
    ]
  },
  {
    "route_id": "A-141",
    "route_name": "বনশ্রী হতে মোহাম্মদপুর শিয়া মসজিদ",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "বনশ্রী", "cumulative_km": 0.0 },
      { "stop_name": "রামপুরা", "cumulative_km": 2.5 },
      { "stop_name": "মহাখালী", "cumulative_km": 10.2 },
      { "stop_name": "আগারগাঁও", "cumulative_km": 14.1 },
      { "stop_name": "শ্যামলী রিং রোড", "cumulative_km": 16.7 },
      { "stop_name": "মোহাম্মদপুর শিয়া মসজিদ", "cumulative_km": 18.2 }
    ]
  },
  {
    "route_id": "A-142",
    "route_name": "পীরজঙ্গী মাজার হতে নতুন বাজার",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "পীরজঙ্গী মাজার", "cumulative_km": 0.0 },
      { "stop_name": "কমলাপুর ষ্টেশন", "cumulative_km": 0.5 },
      { "stop_name": "বাংলাদেশ ব্যাংক", "cumulative_km": 1.5 },
      { "stop_name": "স্টেডিয়াম", "cumulative_km": 2.8 },
      { "stop_name": "পল্টন", "cumulative_km": 3.5 },
      { "stop_name": "কাকরাইল", "cumulative_km": 5.0 },
      { "stop_name": "মালিবাগ", "cumulative_km": 5.9 },
      { "stop_name": "মগবাজার", "cumulative_km": 7.2 },
      { "stop_name": "বাংলা মটর", "cumulative_km": 8.2 },
      { "stop_name": "ফার্মগেট", "cumulative_km": 9.7 },
      { "stop_name": "মহাখালী", "cumulative_km": 12.6 },
      { "stop_name": "গুলশান-১", "cumulative_km": 14.5 },
      { "stop_name": "গুলশান-২", "cumulative_km": 16.1 },
      { "stop_name": "নতুন বাজার", "cumulative_km": 16.7 }
    ]
  },
  {
    "route_id": "A-143",
    "route_name": "পীরজঙ্গী মাজার হতে নতুন বাজার",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "পীরজঙ্গী মাজার", "cumulative_km": 0.0 },
      { "stop_name": "কমলাপুর ষ্টেশন", "cumulative_km": 0.5 },
      { "stop_name": "বাংলাদেশ ব্যাংক", "cumulative_km": 1.5 },
      { "stop_name": "স্টেডিয়াম", "cumulative_km": 2.8 },
      { "stop_name": "পল্টন", "cumulative_km": 3.5 },
      { "stop_name": "কাকরাইল", "cumulative_km": 5.0 },
      { "stop_name": "মালিবাগ", "cumulative_km": 5.9 },
      { "stop_name": "মগবাজার", "cumulative_km": 7.2 },
      { "stop_name": "সাতরাস্তা", "cumulative_km": 8.2 },
      { "stop_name": "নাবিস্কো", "cumulative_km": 9.5 },
      { "stop_name": "মহাখালী", "cumulative_km": 10.3 },
      { "stop_name": "তিতুমীর কলেজ", "cumulative_km": 11.1 },
      { "stop_name": "গুলশান-১", "cumulative_km": 12.2 },
      { "stop_name": "নতুন বাজার", "cumulative_km": 15.0 }
    ]
  },
  {
    "route_id": "A-157",
    "route_name": "বনশ্রী হতে মোহাম্মদপুর",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "বনশ্রী", "cumulative_km": 0.0 },
      { "stop_name": "মৌচাক", "cumulative_km": 5.8 },
      { "stop_name": "কাকরাইল", "cumulative_km": 6.7 },
      { "stop_name": "শাহবাগ", "cumulative_km": 8.8 },
      { "stop_name": "সাইন্সল্যাব", "cumulative_km": 10.0 },
      { "stop_name": "জিগাতলা", "cumulative_km": 11.1 },
      { "stop_name": "মোহাম্মদপুর (আসাদ এভিনিউ)", "cumulative_km": 14.0 }
    ]
  },
  {
    "route_id": "A-160",
    "route_name": "মোহাম্মদপুর (জাপান গার্ডেন সিটি) হতে পোস্তগোলা",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "মোঃপুর (জাপান গার্ডেন সিটি)", "cumulative_km": 0.0 },
      { "stop_name": "শ্যামলী", "cumulative_km": 2.8 },
      { "stop_name": "আসাদগেট", "cumulative_km": 4.4 },
      { "stop_name": "সাইন্সল্যাব", "cumulative_km": 7.1 },
      { "stop_name": "শাহবাগ", "cumulative_km": 8.6 },
      { "stop_name": "কাকরাইল", "cumulative_km": 10.1 },
      { "stop_name": "ফকিরাপুল", "cumulative_km": 11.3 },
      { "stop_name": "বাংলাদেশ ব্যাংক", "cumulative_km": 12.4 },
      { "stop_name": "দয়াগঞ্জ রোড", "cumulative_km": 13.9 },
      { "stop_name": "পোস্তগোলা", "cumulative_km": 16.2 }
    ]
  },
  {
    "route_id": "A-161",
    "route_name": "ঘাটারচর হতে ধূপখোলা",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "ঘাটারচর", "cumulative_km": 0.0 },
      { "stop_name": "মোঃপুর", "cumulative_km": 6.0 },
      { "stop_name": "শঙ্কর", "cumulative_km": 6.9 },
      { "stop_name": "ধানমন্ডি-১৫", "cumulative_km": 7.1 },
      { "stop_name": "জিগাতলা", "cumulative_km": 8.4 },
      { "stop_name": "ঢাকা সিটি কলেজ", "cumulative_km": 9.2 },
      { "stop_name": "সাইন্সল্যাব", "cumulative_km": 9.6 },
      { "stop_name": "ঢাকা কলেজ", "cumulative_km": 9.8 },
      { "stop_name": "নিউ মার্কেট", "cumulative_km": 10.2 },
      { "stop_name": "আজিমপুর", "cumulative_km": 10.9 },
      { "stop_name": "নীলক্ষেত", "cumulative_km": 11.9 },
      { "stop_name": "ধোপখোলা", "cumulative_km": 20.5 }
    ]
  },
  {
    "route_id": "A-166",
    "route_name": "মোহাম্মদপুর (বাস ষ্ট্যান্ড) হতে উত্তরা হাউজ বিল্ডিং",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "মোহাম্মদপুর", "cumulative_km": 0.0 },
      { "stop_name": "টাউন হল", "cumulative_km": 1.4 },
      { "stop_name": "আসাদগেট", "cumulative_km": 2.4 },
      { "stop_name": "ফার্মগেট", "cumulative_km": 3.9 },
      { "stop_name": "মহাখালী", "cumulative_km": 7.0 },
      { "stop_name": "তিতুমীর কলেজ", "cumulative_km": 7.8 },
      { "stop_name": "গুলশান-১", "cumulative_km": 8.8 },
      { "stop_name": "मध्य बाड्डा", "cumulative_km": 9.7 },
      { "stop_name": "উত্তর বাড্ডা", "cumulative_km": 10.9 },
      { "stop_name": "নতুন বাজার", "cumulative_km": 11.1 },
      { "stop_name": "বসুন্ধরা", "cumulative_km": 13.0 },
      { "stop_name": "নৰ্দ্দা", "cumulative_km": 13.6 },
      { "stop_name": "কুড়িল বিশ্বরোড", "cumulative_km": 14.1 },
      { "stop_name": "খিলক্ষেত", "cumulative_km": 14.6 },
      { "stop_name": "নিউ এয়ারপোর্ট", "cumulative_km": 17.2 },
      { "stop_name": "রাজলক্ষ্মী", "cumulative_km": 18.7 },
      { "stop_name": "হাউজ বিল্ডিং", "cumulative_km": 20.5 }
    ]
  },
  {
    "route_id": "A-173",
    "route_name": "বাবু বাজার ব্রীজ হতে ধওর ব্রীজ",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "বাবু বাজার ব্রীজ", "cumulative_km": 0.0 },
      { "stop_name": "ফুলবাড়ীয়া", "cumulative_km": 3.0 },
      { "stop_name": "পল্টন", "cumulative_km": 4.0 },
      { "stop_name": "রাজমনি", "cumulative_km": 5.0 },
      { "stop_name": "মালিবাগ", "cumulative_km": 6.2 },
      { "stop_name": "মৌচাক", "cumulative_km": 6.6 },
      { "stop_name": "আবুল হোটেল", "cumulative_km": 7.6 },
      { "stop_name": "টিভি সেন্টার", "cumulative_km": 8.6 },
      { "stop_name": "মধ্য বাড্ডা", "cumulative_km": 10.6 },
      { "stop_name": "নতুন বাজার", "cumulative_km": 12.6 },
      { "stop_name": "কুড়িল বিশ্বরোড", "cumulative_km": 15.0 },
      { "stop_name": "এয়ারপোর্ট", "cumulative_km": 18.7 },
      { "stop_name": "আজমপুর", "cumulative_km": 21.2 },
      { "stop_name": "আব্দুল্লাহপুর", "cumulative_km": 22.2 },
      { "stop_name": "ধওর ব্রীজ", "cumulative_km": 25.2 }
    ]
  },
  {
    "route_id": "A-181",
    "route_name": "সাভার হতে বাড্ডা নতুন বাজার",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "সাভার", "cumulative_km": 0.0 },
      { "stop_name": "হেমায়েতপুর", "cumulative_km": 6.7 },
      { "stop_name": "গাবতলী", "cumulative_km": 14.3 },
      { "stop_name": "টেকনিক্যাল", "cumulative_km": 15.3 },
      { "stop_name": "মহাখালী", "cumulative_km": 23.0 },
      { "stop_name": "গুলশান-১", "cumulative_km": 25.6 },
      { "stop_name": "নুতন বাজার", "cumulative_km": 27.8 }
    ]
  },
  {
    "route_id": "A-182",
    "route_name": "মিরপুর-১৪ হতে চন্দ্রা",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "মিরপুর-১৪", "cumulative_km": 0.0 },
      { "stop_name": "মিরপুর-১০", "cumulative_km": 2.3 },
      { "stop_name": "মিরপুর-১", "cumulative_km": 4.2 },
      { "stop_name": "প্রিয়াঙ্গন গেট", "cumulative_km": 4.8 },
      { "stop_name": "ইস্টার্ন হাউজিং", "cumulative_km": 9.0 },
      { "stop_name": "ধওর", "cumulative_km": 17.5 },
      { "stop_name": "জিরাব", "cumulative_km": 23.0 },
      { "stop_name": "ফ্যান্টাসী", "cumulative_km": 27.2 },
      { "stop_name": "বাইপাইল", "cumulative_km": 29.5 },
      { "stop_name": "ইপিজেড", "cumulative_km": 31.0 },
      { "stop_name": "জিরানী", "cumulative_km": 36.0 },
      { "stop_name": "নন্দনপার্ক", "cumulative_km": 40.0 },
      { "stop_name": "চন্দ্রা", "cumulative_km": 42.5 }
    ]
  },
  {
    "route_id": "A-190",
    "route_name": "সাভার ইপিজেড হতে নারায়ণগঞ্জ লিংকরোড",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "ইপিজেড", "cumulative_km": 0.0 },
      { "stop_name": "গাবতলি", "cumulative_km": 25.9 },
      { "stop_name": "কল্যাণপুর", "cumulative_km": 28.3 },
      { "stop_name": "কলেজগেট", "cumulative_km": 29.6 },
      { "stop_name": "ফার্মগেট", "cumulative_km": 32.4 },
      { "stop_name": "বাংলাদেশ ব্যাংক", "cumulative_km": 38.0 },
      { "stop_name": "সায়েদাবাদ", "cumulative_km": 40.0 },
      { "stop_name": "লিংক রোড", "cumulative_km": 46.2 }
    ]
  },
  {
    "route_id": "A-192",
    "route_name": "সাভার ইপিজেড হতে নারায়ণগঞ্জ লিংকরোড",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "ইপিজেড", "cumulative_km": 0.0 },
      { "stop_name": "সাভার", "cumulative_km": 12.8 },
      { "stop_name": "গাবতলি", "cumulative_km": 25.9 },
      { "stop_name": "কল্যাণপুর", "cumulative_km": 28.3 },
      { "stop_name": "কলেজগেট", "cumulative_km": 29.6 },
      { "stop_name": "ফার্মগেট", "cumulative_km": 32.4 },
      { "stop_name": "বাংলামটর", "cumulative_km": 34.0 },
      { "stop_name": "মগবাজার", "cumulative_km": 35.0 },
      { "stop_name": "মালিবাগ", "cumulative_km": 36.3 },
      { "stop_name": "বাসাবো", "cumulative_km": 38.7 },
      { "stop_name": "জনপথ", "cumulative_km": 41.7 },
      { "stop_name": "যাত্রাবাড়ী", "cumulative_km": 42.3 },
      { "stop_name": "নাঃগঞ্জ লিংক রোড", "cumulative_km": 47.5 }
    ]
  },
  {
    "route_id": "A-202",
    "route_name": "সাভার হতে আমুলিয়া স্টাফ কোয়ার্টার",
    "fare_per_km": 2.53,
    "minimum_fare": 10.0,
    "stops": [
      { "stop_name": "সাভার", "cumulative_km": 0.0 },
      { "stop_name": "গাবতলী", "cumulative_km": 13.8 },
      { "stop_name": "মিরপুর-১", "cumulative_km": 16.9 },
      { "stop_name": "মিরপুর-১০", "cumulative_km": 18.8 },
      { "stop_name": "মহাখালী", "cumulative_km": 26.3 },
      { "stop_name": "গুলশান-১", "cumulative_km": 28.7 },
      { "stop_name": "বনশ্রী", "cumulative_km": 35.0 },
      { "stop_name": "আমুলিয়া স্টাফ কোয়ার্টার", "cumulative_km": 43.0 }
    ]
  }
];
