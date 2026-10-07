import React from 'react';
import {Link} from 'react-router-dom';
import useAccountProfile from '@/hooks/useAccountProfile';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
export default function AccountIdentity({to,role,fallbackName}) {
  const {profile}=useAccountProfile();
  const name=profile?.display_name||fallbackName||'Account';
  return <Link to={to} title="Edit your profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <ProfileAvatar image={profile?.profile_image} name={name} className="h-8 w-8 text-xs"/>
    <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-primary-foreground">{name}</p><p className="text-[10px] text-primary-foreground/70">{role}</p></div>
  </Link>;
}