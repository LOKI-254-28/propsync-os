import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import usePublicCatalog from '@/hooks/usePublicCatalog';
import PublicLayout from "@/components/public/PublicLayout";
import HomeHero from '@/components/home/HomeHero';
import HomeFeaturedRentals from '@/components/home/HomeFeaturedRentals';
import HomeExperience from '@/components/home/HomeExperience';
import '@/components/home/HomePresentation.css';

export default function PublicHome() {
  const { isLoadingAuth } = useAuth();
  const catalog = usePublicCatalog();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  if (isLoadingAuth) {
    return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  }




  const submitSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (maxPrice) params.set("max", maxPrice);
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <PublicLayout home>
      <HomeHero search={search} setSearch={setSearch} type={type} setType={setType} maxPrice={maxPrice} setMaxPrice={setMaxPrice} submitSearch={submitSearch} />
      <HomeFeaturedRentals catalog={catalog} />
      <HomeExperience />
    </PublicLayout>
  );
}