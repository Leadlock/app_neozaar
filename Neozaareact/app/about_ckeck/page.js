"use client";
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import Header from '../layouts/Header';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Footer from "../layouts/Footer";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useState, useEffect } from 'react';
import { Users, Shield, Lightbulb } from 'lucide-react';

export default function AboutPage() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [visibleCards, setVisibleCards] = useState(4);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (e) => e.key === 'Escape' && setIsOpen(false);
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Carousel functionality
    const getVisibleCards = () => {
        if (typeof window === 'undefined') return 4;
        const width = window.innerWidth;
        if (width < 640) return 1; // mobile
        if (width < 1024) return 2; // tablet
        return 4; // desktop/laptop
    };

    useEffect(() => {
        setVisibleCards(getVisibleCards());

        const handleResize = () => {
            setVisibleCards(getVisibleCards());
            setCurrentSlide(0);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const teamMembers = [
        {
            name: "Jane Doe",
            role: "Founder & CEO, InnovateTech",
            image: "/assests/about/jane-doe.png",
            gender: "female"
        },
        {
            name: "John Smith",
            role: "Co-Founder, DataStream",
            image: "/assests/about/john-smith.png",
            gender: "male"
        },
        {
            name: "Jane Doe",
            role: "Founder & CEO, InnovateTech",
            image: "/assests/about/jane-doe.png",
            gender: "female"
        },
        {
            name: "John Smith",
            role: "Co-Founder, DataStream",
            image: "/assests/about/john-smith.png",
            gender: "male"
        },
        {
            name: "John Smith",
            role: "Co-Founder, DataStream",
            image: "/assests/about/john-smith.png",
            gender: "male"
        }
    ];

    const features = [
        {
            image: "/assests/about/feature1.png",
            title: "Community-Centric",
            description: "We're not just building for our users; we're building with them. Open feedback loops and community governance are at our core.",
            bgGradient: "from-blue-500/20 to-purple-500/20"
        },
        {
            image: "/assests/about/feature2.png",
            title: "Uncompromising Security",
            description: "In a world of digital threats, we prioritize security above all, implementing cutting-edge protocols to protect your ...",
            bgGradient: "from-red-500/20 to-orange-500/20"
        },
        {
            image: "/assests/about/feature3.png",
            title: "Radical Innovation",
            description: "We challenge the status quo and are not afraid to explore uncharted territory to deliver groundbreaking solutions.",
            bgGradient: "from-yellow-500/20 to-amber-500/20"
        }
    ];

    const maxSlide = Math.max(0, teamMembers.length - visibleCards);

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev >= maxSlide ? 0 : prev + 1));
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev <= 0 ? maxSlide : prev - 1));
    };

    const goToSlide = (index) => {
        setCurrentSlide(index);
    };

    const NAV_LINKS = [
        { href: '/isv-registration', label: 'ISV Registration' },
        { href: '/partner-with-us', label: 'Partner With Us' },
        { href: '/contact-us', label: 'Contact Us' },
    ];

    const handleMarketplaceClick = () => {
        const isLoggedIn = localStorage.getItem("token");
        if (isLoggedIn) {
            router.push("/");
        } else {
            router.push("/auth/login");
        }
    };

    return (
        <>
            <main className="bg-black min-h-screen w-full mx-auto max-w-[1920px]">
                {/* Hero Section */}
                <section className="relative w-full flex flex-col items-center justify-start pt-8 px-2 sm:px-6 pb-15 min-h-screen lg:min-h-screen 2xl:min-h-auto">
                    {/* Background Video */}
                    <div className='w-full h-full absolute z-0 bg-black'></div>
                    <video
                        className="absolute inset-0 w-full h-full object-cover z-0"
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ opacity: 0.7, pointerEvents: 'none' }}
                    >
                        <source src="/assests/homepagevideo.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                    <div className="text-white z-10 m-auto my-0 w-full h-full">
                        <Header />
                    </div>
                    {/* Hero Content */}
                    <div className="relative mx-auto md:my-35 lg:my-25 my-24 w-full max-w-full sm:max-w-[800px] flex flex-col items-center justify-center rounded-lg text-center px-2">
                        <h1 className="text-white font-light font-['serif'] text-3xl sm:text-4xl md:text-5xl mb-4 leading-snug">
                            Shaping the Future, Together.
                        </h1>
                        <p className="text-gray-200 mb-6 px-2 sm:px-6 text-sm sm:text-base font-['Inter',_sans-serif] mt-3">
                            NeoZaar is more than a company; it{" ' "}s a movement towards a more <br />
                            innovative and connected digital world. Discover our story, <br />
                            our mission, and the people driving us forward.
                        </p>
                    </div>
                </section>

                {/* Founder Section */}
                <div className="py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <div className="text-center mb-16">
                            <h1 className="text-white text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
                                Meet Our Founder
                            </h1>
                            <p className="text-gray-400 text-lg sm:text-xl">
                                The visionary mind behind NeoZaar.
                            </p>
                        </div>

                        {/* Founder Card */}
                        <div className="bg-zinc-900 rounded-2xl p-6 sm:p-8 lg:p-12 mb-16 border border-zinc-800">
                            <div className="flex flex-col lg:flex-row gap-8 items-start">
                                {/* Profile Image */}
                              <div className="flex-shrink-0 mx-auto lg:mx-0">
    <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-lg overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600">
        <Image
            src="/assests/about/rajesh.png"
            alt="Rajesh Thadhani"
            className="w-full h-full object-cover"
            width={256}
            height={256}
        />
    </div>
</div>

                                {/* Content */}
                                <div className="flex-1 text-center lg:text-left">
                                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-500 mb-3">
                                        Rajesh Thadhani
                                    </h2>
                                    <p className="text-gray-400 text-lg sm:text-xl mb-6">
                                        Founder & Chief Visionary Officer
                                    </p>
                                    <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6">
                                        With over two decades of experience at the intersection of technology and finance, Rajesh is a serial entrepreneur with a passion for disruptive innovation. He founded NeoZaar with the belief that the next wave of the internet should be more equitable and empowering for all. His leadership is defined by a deep commitment to engineering excellence and a user-first philosophy.
                                    </p>

                                    {/* Social Icons */}
                                    <div className="flex gap-4 justify-center lg:justify-start">
                                        <a
                                            href="#"
                                            className="text-gray-400 hover:text-blue-400 transition-colors"
                                            aria-label="Twitter"
                                        >
                                            <Image src="/assests/about/twitter.png" alt="Twitter" width={24} height={24} />
                                        </a>
                                        <a
                                            href="#"
                                            className="text-gray-400 hover:text-blue-400 transition-colors"
                                            aria-label="LinkedIn"
                                        >
                                            <Image src="/assests/about/linkedin.png" alt="LinkedIn" width={24} height={24}/>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Vision and Mission */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Our Vision */}
                            <div className="bg-zinc-900 rounded-2xl p-6 sm:p-8 border border-zinc-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <Image src="/assests/about/vision.png" alt="Vision" width={28} height={28} />
                                    <h3 className="text-white text-2xl sm:text-3xl font-bold">Our Vision</h3>
                                </div>
                                <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                                    To be the leading catalyst for digital transformation, empowering creators and businesses to build a decentralized, transparent, and universally accessible future. We envision a world where technology serves humanity{"'"}s collective progress.
                                </p>
                            </div>

                            {/* Our Mission */}
                            <div className="bg-zinc-900 rounded-2xl p-6 sm:p-8 border border-zinc-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <Image src="/assests/about/mision.png" alt="Mission" width={28} height={28} />
                                    <h3 className="text-white text-2xl sm:text-3xl font-bold">Our Mission</h3>
                                </div>
                                <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                                    To build foundational platforms and tools that are intuitive, powerful, and secure. We are committed to fostering a vibrant ecosystem through collaboration, open-source principles, and a relentless focus on user-centric design.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Members Section */}
                <div className="py-12 px-4 sm:px-6 lg:px-8">
                    <div className="w-full max-w-7xl mx-auto">
                        <div className="text-center mb-12 sm:mb-16">
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 text-white">
                                Our Team Members
                            </h1>
                            <p className="text-gray-400 text-sm sm:text-base">
                                NeoZaar is working with amazing Team members.
                            </p>
                        </div>

                        {/* Carousel Container */}
                        <div className="relative w-full">
                            {/* Navigation Buttons */}
                            <div
                                onClick={prevSlide}
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-6 lg:-translate-x-12 z-10 w-10 h-10 sm:w-12 sm:h-12  rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm cursor-pointer text-center"
                                aria-label="Previous slide"
                            >
                                <div className="w-5 h-5 sm:w-6 sm:h-6 text-3xl  text-orange-500">‹</div>
                            </div>

                            <div
                                onClick={nextSlide}
                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-6 lg:translate-x-12 z-10 w-10 h-10 sm:w-12 sm:h-12  rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm cursor-pointer  text-center"
                                aria-label="Next slide"
                            >
                                <div className="w-5 h-5 sm:w-6 sm:h-6 text-3xl text-orange-500">›</div>
                            </div>

                            {/* Cards Container */}
                          

                            <div className="overflow-hidden">
                                <div
                                    className="flex transition-transform duration-500 ease-out"
                                    style={{
                                        transform: `translateX(-${currentSlide * (100 / visibleCards)}%)`
                                    }}
                                >
                                    {teamMembers.map((member, index) => (
                                        <div
                                            key={index}
                                            className="flex-shrink-0 px-2 sm:px-3 lg:px-4"
                                            style={{ width: `${100 / visibleCards}%` }}
                                        >
                                            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:transform hover:scale-105">
                                                {/* Profile Image */}
                                                <div className="flex justify-center mb-6">
                                                    <div className="relative">
                                                        <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden ring-4 ring-purple-500/30">
                                                            <Image
                                                                src={member.image}
                                                                alt={member.name}
                                                                className=" object-cover"
                                                                fill
                                                            />
                                                        </div>
                                                        {member.gender === 'male' && (
                                                            <div className="absolute -bottom-2 -right-2 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br flex items-center justify-center">

                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Member Info */}
                                                <div className="text-center mb-6">
                                                    <h3 className="text-lg sm:text-xl font-semibold mb-2 text-white">
                                                        {member.name}
                                                    </h3>
                                                    <p className="text-gray-400 text-xs sm:text-sm">
                                                        {member.role}
                                                    </p>
                                                </div>

                                                {/* Read Story Button */}
                                                <div className="w-full group flex items-center justify-center gap-2 text-orange-500 hover:text-orange-400 transition-colors duration-300 text-sm sm:text-base font-medium cursor-pointer">
                                                    Read {member.gender === 'female' ? 'her' : 'his'} story
                                                    <div className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300">→</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                       

                            {/* Dots Indicator */}
                            <div className="flex justify-center gap-2 mt-8 sm:mt-12">
                                {Array.from({ length: maxSlide + 1 }).map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToSlide(index)}
                                        className={`transition-all duration-300 rounded-full ${currentSlide === index
                                                ? 'w-8 h-2 bg-orange-500'
                                                : 'w-2 h-2 bg-gray-600 hover:bg-gray-500'
                                            }`}
                                        aria-label={`Go to slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* What Makes Us Different Section */}
                <div className="py-12 px-4 sm:px-6 lg:px-8">
                    <div className="w-full max-w-7xl mx-auto">
                        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-5 text-white">
                                What Makes Us Different
                            </h1>
                            <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-3xl mx-auto px-4">
                                Our core principles guide every decision we make and every line of code we write.
                            </p>
                        </div>

                        {/* Features Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className="group relative"
                                >
                                    {/* Card */}
                                    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 transition-all duration-500 hover:transform hover:scale-105 h-full flex flex-col">
                                        {/* Icon Container */}
                                        <div className="flex justify-center mb-6 sm:mb-8">
                                            <div className={`relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full border-2 border-[#FFA348] flex items-center justify-center  transition-all duration-500 group-hover:shadow-lg`}>
                                                <div className='w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 flex justify-center items-center'>
                                                    <div className='relative h-10 w-10' >
                                                      <Image
                                                    src={feature.image}
                                                    alt={feature.title}
                                                    className="object-contain h-10 w-10"
                                                    fill
                                                />
                                                    </div>

                                              
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="text-center flex-grow flex flex-col">
                                            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-white group-hover:text-white transition-colors duration-300">
                                                {feature.title}
                                            </h3>
                                            <p className="text-gray-400 text-sm sm:text-base leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                                                {feature.description}
                                            </p>
                                        </div>

                                        {/* Hover Effect Overlay */}
                                        <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Join Our Journey Section */}
                <div className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Heading */}
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8 text-white">
                            Join Our Journey
                        </h2>

                        {/* Description */}
                        <p className="text-gray-400 text-sm sm:text-base md:text-lg leading-relaxed mb-8 sm:mb-10 md:mb-12 max-w-3xl mx-auto px-2">
                            We{"'"}re always looking for passionate, talented individuals to join our team.
                            While we don{"'"}t have open positions right now, our careers page will be
                            launching soon. Interested in partnering or have a question? Get in touch.
                        </p>

                        {/* CTA Button */}
                        <button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-8 sm:px-10 md:px-12 py-3 sm:py-3.5 md:py-4 rounded-full text-sm sm:text-base md:text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/50 active:scale-95">
                            Contact Us
                        </button>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}