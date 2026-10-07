import React from 'react';
import {PageHeader} from '@/components/ui-bits';
import AccountProfileEditor from '@/components/profile/AccountProfileEditor';
export default function AccountProfile() {
  return <div><PageHeader title="My Profile" description="Edit your account name and photograph."/><div className="max-w-xl"><AccountProfileEditor/></div></div>;
}