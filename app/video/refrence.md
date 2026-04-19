<!DOCTYPE html>

<html dir="rtl" lang="ar"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Tajawal:wght@400;500;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "surface-container": "#eeeeec",
                    "outline-variant": "#c1c8c5",
                    "surface-bright": "#faf9f7",
                    "on-primary-fixed": "#00201b",
                    "tertiary": "#280001",
                    "on-secondary-fixed-variant": "#3d4946",
                    "on-tertiary-fixed": "#410003",
                    "background": "#faf9f7",
                    "primary": "#00120e",
                    "inverse-on-surface": "#f1f1ef",
                    "error-container": "#ffdad6",
                    "outline": "#717976",
                    "surface-variant": "#e3e2e1",
                    "on-secondary-fixed": "#121e1b",
                    "tertiary-fixed": "#ffdad6",
                    "secondary-fixed-dim": "#bcc9c5",
                    "on-tertiary-container": "#fa4b47",
                    "surface-tint": "#44655d",
                    "on-secondary": "#ffffff",
                    "on-secondary-container": "#5a6763",
                    "surface-dim": "#dadad8",
                    "on-error-container": "#93000a",
                    "error": "#ba1a1a",
                    "secondary-container": "#d8e6e1",
                    "on-surface": "#1a1c1b",
                    "tertiary-container": "#510005",
                    "on-surface-variant": "#414846",
                    "tertiary-fixed-dim": "#ffb3ac",
                    "surface-container-high": "#e8e8e6",
                    "primary-container": "#062923",
                    "primary-fixed-dim": "#abcec4",
                    "on-background": "#1a1c1b",
                    "on-tertiary-fixed-variant": "#930010",
                    "secondary-fixed": "#d8e6e1",
                    "on-primary": "#ffffff",
                    "on-primary-fixed-variant": "#2d4d46",
                    "surface-container-low": "#f4f3f2",
                    "inverse-surface": "#2f3130",
                    "surface-container-lowest": "#ffffff",
                    "secondary": "#54615d",
                    "surface-container-highest": "#e3e2e1",
                    "surface": "#faf9f7",
                    "on-tertiary": "#ffffff",
                    "on-error": "#ffffff",
                    "primary-fixed": "#c6eae0",
                    "inverse-primary": "#abcec4",
                    "on-primary-container": "#709289"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "1.5rem",
                    "full": "9999px"
            },
            "fontFamily": {
                    "headline": ["Plus Jakarta Sans", "Tajawal"],
                    "body": ["Tajawal", "Inter"],
                    "label": ["Tajawal", "Inter"]
            }
          },
        },
      }
    </script>
<style>
        body { font-family: 'Tajawal', sans-serif; }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .header-gradient {
            background: radial-gradient(circle at top right, #062923, #00120e);
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-background text-on-surface min-h-screen pb-32">
<!-- TopAppBar -->
<header class="bg-[#062923] dark:bg-[#00120e] flex items-center px-6 py-4 w-full justify-between rtl font-['Plus_Jakarta_Sans','Tajawal'] font-bold text-lg text-white docked full-width top-0 z-50">
<div class="flex items-center gap-4">
<span class="material-symbols-outlined text-white transition-all duration-300 ease-in-out hover:bg-white/10 p-2 rounded-full cursor-pointer">arrow_forward</span>
<h1 class="text-white font-bold text-xl">الملف الشخصي</h1>
</div>
<div class="flex items-center">
<span class="material-symbols-outlined text-white/70 hover:bg-white/10 p-2 rounded-full cursor-pointer transition-all">settings</span>
</div>
</header>
<main class="max-w-4xl mx-auto px-6 mt-8 space-y-8">
<!-- Profile Header Section: Bento Style Integration -->
<section class="grid grid-cols-1 md:grid-cols-3 gap-6">
<!-- Hero Card -->
<div class="md:col-span-2 bg-primary-container rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 text-on-primary relative overflow-hidden header-gradient">
<div class="relative z-10">
<div class="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary-fixed-dim to-transparent ring-4 ring-primary-container shadow-2xl">
<img alt="Profile" class="w-full h-full object-cover rounded-full" data-alt="professional headshot of a middle-aged male teacher with a warm smile and intellectual appearance, studio lighting, neutral background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvEy8SAT-SxCCOWQjRvieyCE5RpKkB_3aNkLkjF8Be06An7u-kD2OgGhW_fbGkk8OWUnLU5zjL4_zen9A1zQOSjT9fG9QZrAu-a6yla7KUPeDJvdgXQwB_xTSYCvXMTy_deD3vgGleHqtOm3sv1rWqLCzifgnSBHtpA9Tw1ho7he7wFRx0zHIqkfYwSaV7KGK6WE9fd3dUrzkhH5c-dttqkYGC1Y9NbCvBt1Ss8xTSwjYO-vLg537v43X0M1TCoSsHwqKcS-6D7U7k"/>
</div>
</div>
<div class="flex flex-col text-center md:text-right z-10">
<h2 class="text-3xl font-bold font-headline text-white mb-1">أستاذ أحمد</h2>
<p class="text-on-primary-container font-medium text-lg mb-4">معلم خبير</p>
<div class="flex items-center justify-center md:justify-start gap-2 text-white/80 bg-white/5 py-2 px-4 rounded-full w-fit">
<span class="material-symbols-outlined text-sm">mail</span>
<span class="text-sm font-label">ahmad@gmail.com</span>
</div>
</div>
<!-- Abstract Decorative Elements -->
<div class="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
<div class="absolute -top-10 -right-10 w-60 h-60 bg-primary-fixed-dim/10 rounded-full blur-2xl"></div>
</div>
<!-- Fast Stats Bento -->
<div class="space-y-6">
<div class="bg-surface-container-lowest p-6 rounded-xl shadow-[0_12px_32px_-4px_rgba(6,41,35,0.06)] flex flex-col justify-center border-r-4 border-primary-container">
<span class="text-on-surface-variant text-sm font-label mb-2">المادة الدراسية</span>
<h3 class="text-primary-container font-bold text-2xl">الرياضيات</h3>
</div>
<div class="bg-surface-container-lowest p-6 rounded-xl shadow-[0_12px_32px_-4px_rgba(6,41,35,0.06)] flex flex-col justify-center border-r-4 border-secondary">
<span class="text-on-surface-variant text-sm font-label mb-2">تاريخ الانضمام</span>
<h3 class="text-on-surface font-bold text-2xl font-headline">2026</h3>
</div>
</div>
</section>
<!-- Navigation Clusters (Editorial List) -->
<section class="space-y-4">
<h4 class="text-on-surface-variant font-bold text-sm tracking-widest px-2">إدارة المحتوى التعليمي</h4>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<!-- Action Item 1 -->
<div class="group bg-surface-container-lowest p-6 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-300 hover:shadow-xl hover:bg-surface-bright">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center text-primary-container group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined">video_library</span>
</div>
<div>
<h5 class="text-on-surface font-bold text-lg">المحاضرات المرفوعة</h5>
<p class="text-on-surface-variant text-xs">إدارة وتعديل الفيديوهات التعليمية</p>
</div>
</div>
<span class="material-symbols-outlined text-outline-variant group-hover:translate-x-[-4px] transition-transform">chevron_left</span>
</div>
<!-- Action Item 2 -->
<div class="group bg-surface-container-lowest p-6 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-300 hover:shadow-xl hover:bg-surface-bright">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center text-primary-container group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined">quiz</span>
</div>
<div>
<h5 class="text-on-surface font-bold text-lg">الاختبارات المنشأة</h5>
<p class="text-on-surface-variant text-xs">مراجعة نتائج الطلاب وتعديل الأسئلة</p>
</div>
</div>
<span class="material-symbols-outlined text-outline-variant group-hover:translate-x-[-4px] transition-transform">chevron_left</span>
</div>
</div>
</section>
<!-- Performance Summary (Asymmetric Card) -->
<section class="bg-surface-container-low rounded-xl p-8 relative overflow-hidden">
<div class="relative z-10">
<h4 class="text-primary-container font-bold text-xl mb-6">ملخص النشاط</h4>
<div class="grid grid-cols-2 md:grid-cols-4 gap-8">
<div class="text-center md:text-right">
<p class="text-on-surface-variant text-xs mb-1">الطلاب المشتركون</p>
<p class="text-2xl font-bold font-headline">١,٢٥٠</p>
</div>
<div class="text-center md:text-right">
<p class="text-on-surface-variant text-xs mb-1">المحاضرات</p>
<p class="text-2xl font-bold font-headline">٤٨</p>
</div>
<div class="text-center md:text-right">
<p class="text-on-surface-variant text-xs mb-1">متوسط التقييم</p>
<p class="text-2xl font-bold font-headline flex items-center justify-center md:justify-start gap-1">
                            ٤.٩ <span class="material-symbols-outlined text-amber-500 text-lg" style="font-variation-settings: 'FILL' 1;">star</span>
</p>
</div>
<div class="text-center md:text-right">
<p class="text-on-surface-variant text-xs mb-1">ساعات المشاهدة</p>
<p class="text-2xl font-bold font-headline">٣.٢ ألف</p>
</div>
</div>
</div>
<!-- Decorative Pattern -->
<div class="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none" style="background-image: radial-gradient(#062923 1px, transparent 1px); background-size: 20px 20px;"></div>
</section>
<!-- Logout Action -->
<div class="pt-8 flex justify-center">
<button class="flex items-center gap-3 px-12 py-4 bg-tertiary-container text-on-tertiary-container rounded-full font-bold hover:bg-red-900 transition-colors shadow-lg active:scale-95 duration-200">
<span class="material-symbols-outlined">logout</span>
                تسجيل الخروج
            </button>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 rtl bg-white/70 dark:bg-[#062923]/70 backdrop-blur-xl rounded-t-[1.5rem] shadow-[0_12px_32px_-4px_rgba(6,41,35,0.08)]">
<div class="flex flex-col items-center justify-center text-[#414846] dark:text-[#c1c8c5] px-5 py-2 hover:bg-[#eeeeec] dark:hover:bg-white/5 transition-transform scale-95 active:scale-90 cursor-pointer">
<span class="material-symbols-outlined">home</span>
<span class="font-['Plus_Jakarta_Sans','Tajawal'] font-medium text-xs">الرئيسية</span>
</div>
<div class="flex flex-col items-center justify-center text-[#414846] dark:text-[#c1c8c5] px-5 py-2 hover:bg-[#eeeeec] dark:hover:bg-white/5 transition-transform scale-95 active:scale-90 cursor-pointer">
<span class="material-symbols-outlined">book</span>
<span class="font-['Plus_Jakarta_Sans','Tajawal'] font-medium text-xs">المواد</span>
</div>
<div class="flex flex-col items-center justify-center text-[#414846] dark:text-[#c1c8c5] px-5 py-2 hover:bg-[#eeeeec] dark:hover:bg-white/5 transition-transform scale-95 active:scale-90 cursor-pointer">
<span class="material-symbols-outlined">group</span>
<span class="font-['Plus_Jakarta_Sans','Tajawal'] font-medium text-xs">الطلاب</span>
</div>
<div class="flex flex-col items-center justify-center bg-[#062923] dark:bg-[#eeeeec] text-white dark:text-[#062923] rounded-2xl px-5 py-2 transition-transform scale-95 active:scale-90 cursor-pointer">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">person</span>
<span class="font-['Plus_Jakarta_Sans','Tajawal'] font-medium text-xs">الملف الشخصي</span>
</div>
</nav>
</body></html>