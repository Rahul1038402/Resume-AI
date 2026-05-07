import CardNav from "../ui/CardNav";

const Header = () => {
    const items = [
    {
      label: "Features",
      bgColor: "#0D0716",
      textColor: "#fff",
      links: [
        { label: "Home", ariaLabel: "HomePage", href: "/" },
        { label: "Builder", ariaLabel: "Resume Builder", href: "/builder" },
        { label: "Analyzer", ariaLabel: "Resume Analyzer", href: "/analyzer" },
        { label: "Application Tracker", ariaLabel: "Application Tracker", href: "/tracker" }
      ]
    },
    {
      label: "About", 
      bgColor: "#170D27",
      textColor: "#fff",
      links: [
        { label: "About ResumeAI", ariaLabel: "Featured Projects", href: "/about" },
        { label: "About Me", ariaLabel: "Project Case Studies", href: "https://portfolio-website-eight-plum.vercel.app", external: true }
      ]
    },
    {
      label: "Contact",
      bgColor: "#271E37", 
      textColor: "#fff",
      links: [
        { label: "Email", ariaLabel: "Email us", href: "mailto:rahul1038402@gmail.com", external: true },
        { label: "Twitter", ariaLabel: "Twitter", href: "https://x.com/Rahul_Kr_Mall", external: true },
        { label: "LinkedIn", ariaLabel: "LinkedIn",href: "https://www.linkedin.com/in/rahul-kr-mall", external: true }
      ]
    }
  ];

  return (
    <CardNav
      items={items}
      baseColor="#fff"
      menuColor="#000"
      buttonBgColor="#111"
      buttonTextColor="#fff"
      ease="power3.out"
    />
  );
};

export default Header;
